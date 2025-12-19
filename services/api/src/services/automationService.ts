import { PrismaClient, Rule, RuleType } from '@prisma/client';
import { recordAudit } from '../utils/audit';
import { orgWebhookService } from './orgWebhookService';

const prisma = new PrismaClient();

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  inboxId?: string;
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule?: RuleSchedule;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'attachments' | 'headers' | 'size' | 'receivedAt';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'notEquals' | 'notContains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: any;
  caseSensitive?: boolean;
  negate?: boolean;
}

export interface RuleAction {
  type: 'forward' | 'delete' | 'markRead' | 'markUnread' | 'move' | 'copy' | 'label' | 'archive' | 'star' | 'unstar' | 'sendNotification' | 'triggerWebhook' | 'runScript' | 'delay' | 'stopProcessing';
  parameters: Record<string, any>;
  delay?: number; // in seconds
}

export interface RuleSchedule {
  enabled: boolean;
  timezone?: string;
  schedule: string; // cron expression
  startDate?: Date;
  endDate?: Date;
}

export interface RuleEngineContext {
  message: any;
  inbox: any;
  organization?: any;
  metadata?: Record<string, any>;
}

/**
 * Enhanced Automation Rules Engine
 */
export class AutomationService {
  /**
   * Create a new automation rule
   */
  async createRule(
    userId: string,
    rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AutomationRule> {
    const newRule = await prisma.rule.create({
      data: {
        name: rule.name,
        description: rule.description,
        organizationId: rule.organizationId,
        inboxId: rule.inboxId,
        type: RuleType.FORWARD, // Default type, can be extended
        field: 'SUBJECT', // Default field
        pattern: JSON.stringify(rule),
        active: rule.isActive,
        priority: rule.priority,
        reason: rule.description || 'User created automation rule',
        createdBy: userId,
      },
    });

    await recordAudit(userId, 'AUTOMATION_RULE_CREATED', {
      ruleId: newRule.id,
      name: rule.name,
      organizationId: rule.organizationId,
      inboxId: rule.inboxId,
    });

    return this.mapDbRuleToAutomationRule(newRule);
  }

  /**
   * Get automation rules
   */
  async getRules(
    userId: string,
    organizationId?: string,
    inboxId?: string,
    activeOnly: boolean = false
  ): Promise<AutomationRule[]> {
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    } else if (inboxId) {
      where.inboxId = inboxId;
    } else {
      // For personal rules, check ownership
      where.createdBy = userId;
    }

    if (activeOnly) {
      where.active = true;
    }

    const rules = await prisma.rule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      include: {
        inbox: {
          select: { id: true, address: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return rules.map(rule => this.mapDbRuleToAutomationRule(rule));
  }

  /**
   * Update automation rule
   */
  async updateRule(
    userId: string,
    ruleId: string,
    updates: Partial<AutomationRule>
  ): Promise<AutomationRule> {
    const existingRule = await prisma.rule.findUnique({
      where: { id: ruleId }
    });

    if (!existingRule) {
      throw new Error('Rule not found');
    }

    // Check permissions
    if (existingRule.organizationId) {
      // TODO: Check organization membership
    } else if (existingRule.createdBy !== userId) {
      throw new Error('Not authorized to update this rule');
    }

    const updatedRule = await prisma.rule.update({
      where: { id: ruleId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
        ...(updates.isActive !== undefined && { active: updates.isActive }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.conditions || updates.actions) && {
          pattern: JSON.stringify({
            conditions: updates.conditions || [],
            actions: updates.actions || [],
            schedule: updates.schedule,
            metadata: updates.metadata
          })
        }
      }
    });

    await recordAudit(userId, 'AUTOMATION_RULE_UPDATED', {
      ruleId: updatedRule.id,
      changes: Object.keys(updates)
    });

    return this.mapDbRuleToAutomationRule(updatedRule);
  }

  /**
   * Delete automation rule
   */
  async deleteRule(userId: string, ruleId: string): Promise<void> {
    const existingRule = await prisma.rule.findUnique({
      where: { id: ruleId }
    });

    if (!existingRule) {
      throw new Error('Rule not found');
    }

    // Check permissions
    if (existingRule.organizationId) {
      // TODO: Check organization membership
    } else if (existingRule.createdBy !== userId) {
      throw new Error('Not authorized to delete this rule');
    }

    await prisma.rule.delete({
      where: { id: ruleId }
    });

    await recordAudit(userId, 'AUTOMATION_RULE_DELETED', {
      ruleId: ruleId,
      name: existingRule.name
    });
  }

  /**
   * Process message through automation rules
   */
  async processMessage(
    messageId: string,
    context?: Partial<RuleEngineContext>
  ): Promise<{ rulesApplied: string[]; actions: string[] }> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        inbox: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const ruleContext: RuleEngineContext = {
      message,
      inbox: message.inbox,
      organization: message.inbox.organization,
      ...context
    };

    // Get applicable rules
    const rules = await this.getApplicableRules(ruleContext);

    const rulesApplied: string[] = [];
    const actions: string[] = [];

    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, ruleContext)) {
        const executedActions = await this.executeActions(rule.actions, ruleContext);
        rulesApplied.push(rule.id);
        actions.push(...executedActions);

        // Check for stop processing action
        if (executedActions.includes('stopProcessing')) {
          break;
        }
      }
    }

    return { rulesApplied, actions };
  }

  /**
   * Get applicable rules for context
   */
  private async getApplicableRules(context: RuleEngineContext): Promise<AutomationRule[]> {
    const where: any = {
      active: true,
      OR: [
        { organizationId: context.organization?.id },
        { inboxId: context.inbox.id },
        { createdBy: context.metadata?.userId }
      ]
    };

    // Also check global rules
    where.OR.push({
      AND: [
        { organizationId: null },
        { inboxId: null }
      ]
    });

    const rules = await prisma.rule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return rules
      .map(rule => this.mapDbRuleToAutomationRule(rule))
      .filter(rule => this.isRuleApplicable(rule, context));
  }

  /**
   * Check if rule is applicable to context
   */
  private isRuleApplicable(rule: AutomationRule, context: RuleEngineContext): boolean {
    // Check organization filter
    if (rule.organizationId && (!context.organization || context.organization.id !== rule.organizationId)) {
      return false;
    }

    // Check inbox filter
    if (rule.inboxId && context.inbox.id !== rule.inboxId) {
      return false;
    }

    // Check schedule
    if (rule.schedule?.enabled && !this.isScheduleActive(rule.schedule)) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(
    conditions: RuleCondition[],
    context: RuleEngineContext
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(condition.field, context);
      const result = this.evaluateCondition(condition, fieldValue);

      if (condition.negate) {
        if (result) return false;
      } else {
        if (!result) return false;
      }
    }

    return true;
  }

  /**
   * Get field value from message
   */
  private getFieldValue(field: string, context: RuleEngineContext): any {
    const message = context.message;

    switch (field) {
      case 'from':
        return message.fromAddress;
      case 'to':
        return message.toAddress;
      case 'subject':
        return message.subject || '';
      case 'body':
        return message.textContent || message.htmlContent || '';
      case 'attachments':
        return message.attachments || 0;
      case 'headers':
        return message.headers || {};
      case 'size':
        return this.getMessageSize(message);
      case 'receivedAt':
        return message.receivedAt;
      default:
        return null;
    }
  }

  /**
   * Get message size in bytes
   */
  private getMessageSize(message: any): number {
    const size = JSON.stringify(message).length;
    return size;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: RuleCondition, fieldValue: any): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return this.compareValues(fieldValue, value, '==', condition.caseSensitive);
      case 'notEquals':
        return this.compareValues(fieldValue, value, '!=', condition.caseSensitive);
      case 'contains':
        return this.stringContains(fieldValue, value, condition.caseSensitive);
      case 'notContains':
        return !this.stringContains(fieldValue, value, condition.caseSensitive);
      case 'startsWith':
        return this.stringStartsWith(fieldValue, value, condition.caseSensitive);
      case 'endsWith':
        return this.stringEndsWith(fieldValue, value, condition.caseSensitive);
      case 'regex':
        return this.regexMatch(fieldValue, value, condition.caseSensitive);
      case 'greaterThan':
        return Number(fieldValue) > Number(value);
      case 'lessThan':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Compare values with optional case sensitivity
   */
  private compareValues(a: any, b: any, operator: string, caseSensitive: boolean = true): boolean {
    if (typeof a === 'string' && typeof b === 'string' && !caseSensitive) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }

    switch (operator) {
      case '==':
        return a === b;
      case '!=':
        return a !== b;
      default:
        return false;
    }
  }

  /**
   * String contains check
   */
  private stringContains(str: any, substr: string, caseSensitive: boolean = true): boolean {
    if (typeof str !== 'string') return false;
    if (!caseSensitive) {
      str = str.toLowerCase();
      substr = substr.toLowerCase();
    }
    return str.includes(substr);
  }

  /**
   * String starts with check
   */
  private stringStartsWith(str: any, prefix: string, caseSensitive: boolean = true): boolean {
    if (typeof str !== 'string') return false;
    if (!caseSensitive) {
      str = str.toLowerCase();
      prefix = prefix.toLowerCase();
    }
    return str.startsWith(prefix);
  }

  /**
   * String ends with check
   */
  private stringEndsWith(str: any, suffix: string, caseSensitive: boolean = true): boolean {
    if (typeof str !== 'string') return false;
    if (!caseSensitive) {
      str = str.toLowerCase();
      suffix = suffix.toLowerCase();
    }
    return str.endsWith(suffix);
  }

  /**
   * Regex match
   */
  private regexMatch(str: any, pattern: string, caseSensitive: boolean = true): boolean {
    if (typeof str !== 'string') return false;
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(pattern, flags);
    return regex.test(str);
  }

  /**
   * Execute rule actions
   */
  private async executeActions(
    actions: RuleAction[],
    context: RuleEngineContext
  ): Promise<string[]> {
    const executedActions: string[] = [];

    for (const action of actions) {
      // Handle delay before action
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
      }

      switch (action.type) {
        case 'forward':
          await this.executeForward(context, action.parameters);
          executedActions.push('forward');
          break;
        case 'delete':
          await this.executeDelete(context);
          executedActions.push('delete');
          break;
        case 'markRead':
          await this.executeMarkRead(context);
          executedActions.push('markRead');
          break;
        case 'markUnread':
          await this.executeMarkUnread(context);
          executedActions.push('markUnread');
          break;
        case 'sendNotification':
          await this.executeNotification(context, action.parameters);
          executedActions.push('sendNotification');
          break;
        case 'triggerWebhook':
          await this.executeWebhook(context, action.parameters);
          executedActions.push('triggerWebhook');
          break;
        case 'stopProcessing':
          executedActions.push('stopProcessing');
          return executedActions; // Stop processing further actions
      }
    }

    return executedActions;
  }

  /**
   * Execute forward action
   */
  private async executeForward(context: RuleEngineContext, params: any): Promise<void> {
    // Implementation for forwarding email
    console.log(`Forwarding message ${context.message.id} to ${params.toAddress}`);
  }

  /**
   * Execute delete action
   */
  private async executeDelete(context: RuleEngineContext): Promise<void> {
    await prisma.message.delete({
      where: { id: context.message.id }
    });
  }

  /**
   * Execute mark as read action
   */
  private async executeMarkRead(context: RuleEngineContext): Promise<void> {
    await prisma.message.update({
      where: { id: context.message.id },
      data: { read: true }
    });
  }

  /**
   * Execute mark as unread action
   */
  private async executeMarkUnread(context: RuleEngineContext): Promise<void> {
    await prisma.message.update({
      where: { id: context.message.id },
      data: { read: false }
    });
  }

  /**
   * Execute notification action
   */
  private async executeNotification(context: RuleEngineContext, params: any): Promise<void> {
    // Implementation for sending notification
    console.log(`Sending notification for message ${context.message.id}`);
  }

  /**
   * Execute webhook trigger
   */
  private async executeWebhook(context: RuleEngineContext, params: any): Promise<void> {
    const event = {
      id: `automation_${Date.now()}`,
      type: 'automation.rule.triggered',
      data: {
        ruleId: params.ruleId,
        message: context.message,
        action: params.action
      },
      timestamp: new Date(),
      organizationId: context.organization?.id,
      userId: context.metadata?.userId
    };

    await orgWebhookService.triggerEvent(event);
  }

  /**
   * Check if schedule is active
   */
  private isScheduleActive(schedule: RuleSchedule): boolean {
    // Implementation for checking cron schedule
    // For now, return true
    return true;
  }

  /**
   * Map database rule to automation rule
   */
  private mapDbRuleToAutomationRule(dbRule: any): AutomationRule {
    let pattern = {};
    try {
      pattern = JSON.parse(dbRule.pattern || '{}');
    } catch (e) {
      pattern = {};
    }

    return {
      id: dbRule.id,
      name: dbRule.name,
      description: dbRule.reason,
      organizationId: dbRule.organizationId,
      inboxId: dbRule.inboxId,
      isActive: dbRule.active,
      priority: dbRule.priority,
      conditions: (pattern as any).conditions || [],
      actions: (pattern as any).actions || [],
      schedule: (pattern as any).schedule,
      metadata: (pattern as any).metadata,
      createdAt: dbRule.createdAt,
      updatedAt: dbRule.updatedAt
    };
  }

  /**
   * Get automation statistics
   */
  async getAutomationStats(
    userId: string,
    organizationId?: string
  ): Promise<{
    totalRules: number;
    activeRules: number;
    rulesTriggeredToday: number;
    topActions: Array<{ action: string; count: number }>;
  }> {
    // Implementation for calculating automation statistics
    return {
      totalRules: 0,
      activeRules: 0,
      rulesTriggeredToday: 0,
      topActions: []
    };
  }

  /**
   * Test rule against sample message
   */
  async testRule(
    userId: string,
    ruleId: string,
    testMessage: any
  ): Promise<{
    conditionsMet: boolean;
    matchedConditions: Array<{ condition: RuleCondition; result: boolean }>;
    previewActions: string[];
  }> {
    const rule = await this.getRules(userId, undefined, undefined, false)
      .then(rules => rules.find(r => r.id === ruleId));

    if (!rule) {
      throw new Error('Rule not found');
    }

    const context: RuleEngineContext = {
      message: testMessage,
      inbox: testMessage.inbox || { id: 'test-inbox' }
    };

    const matchedConditions = rule.conditions.map(condition => ({
      condition,
      result: this.evaluateCondition(condition, this.getFieldValue(condition.field, context))
    }));

    const conditionsMet = matchedConditions.every(mc => {
      return mc.condition.negate ? !mc.result : mc.result;
    });

    const previewActions = conditionsMet
      ? rule.actions.map(a => a.type)
      : [];

    return {
      conditionsMet,
      matchedConditions,
      previewActions
    };
  }
}

export const automationService = new AutomationService();