import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Branding Features", () => {
  let app: FastifyInstance;
  let org: any;
  let admin: any;
  let user: any;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create organization and users
    org = await prisma.organization.create({
      data: {
        name: "Branding Test Org",
        slug: "branding-test",
        settings: {
          create: {
            customTheme: {
              primaryColor: "#3B82F6",
              secondaryColor: "#10B981",
              logo: "https://example.com/default-logo.png",
              favicon: "https://example.com/favicon.ico",
            },
            require2FA: false,
          },
        },
        members: {
          create: [
            {
              user: {
                create: {
                  email: "admin@test.org",
                  passwordHash: "hashed",
                  role: "ADMIN",
                },
              },
              role: "ADMIN",
            },
            {
              user: {
                create: {
                  email: "user@test.org",
                  passwordHash: "hashed",
                  role: "USER",
                },
              },
              role: "MEMBER",
            },
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });

    admin = org.members.find((m: any) => m.user.role === "ADMIN").user;
    user = org.members.find((m: any) => m.user.role === "USER").user;
  });

  describe("Organization Branding Configuration", () => {
    it("should update organization logo", async () => {
      const brandingUpdate = {
        logo: "https://cdn.example.com/new-logo.png",
        logoAltText: "New Company Logo",
        logoWidth: 200,
        logoHeight: 60,
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: brandingUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.organization.logo).toBe("https://cdn.example.com/new-logo.png");
      expect(body.organization.branding?.logoAltText).toBe("New Company Logo");
      expect(body.organization.branding?.logoWidth).toBe(200);
      expect(body.organization.branding?.logoHeight).toBe(60);
    });

    it("should update organization theme colors", async () => {
      const themeUpdate = {
        primaryColor: "#8B5CF6",
        secondaryColor: "#F59E0B",
        accentColor: "#EF4444",
        backgroundColor: "#F9FAFB",
        textColor: "#111827",
        fontFamily: "Inter, sans-serif",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding/theme`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: themeUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.settings.customTheme).toEqual({
        primaryColor: "#8B5CF6",
        secondaryColor: "#F59E0B",
        accentColor: "#EF4444",
        backgroundColor: "#F9FAFB",
        textColor: "#111827",
        fontFamily: "Inter, sans-serif",
      });
    });

    it("should update favicon", async () => {
      const brandingUpdate = {
        favicon: "https://cdn.example.com/new-favicon.ico",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: brandingUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.organization.favicon).toBe("https://cdn.example.com/new-favicon.ico");
    });

    it("should validate color format", async () => {
      const invalidColor = {
        primaryColor: "invalid-color", // Not a valid hex color
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding/theme`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidColor,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should validate URL format", async () => {
      const invalidUrl = {
        logo: "not-a-url",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidUrl,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Custom Theme Management", () => {
    it("should create custom theme", async () => {
      const themeConfig = {
        name: "Dark Theme",
        description: "Dark mode theme",
        colors: {
          primary: "#1F2937",
          secondary: "#374151",
          accent: "#60A5FA",
          background: "#111827",
          text: "#F9FAFB",
          border: "#374151",
        },
        fonts: {
          primary: "Inter, sans-serif",
          secondary: "Roboto, sans-serif",
        },
        spacing: {
          unit: "8px",
          scale: [0, 1, 2, 3, 4, 5, 6],
        },
        borderRadius: {
          small: "4px",
          medium: "8px",
          large: "12px",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/themes`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: themeConfig,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.theme.name).toBe("Dark Theme");
      expect(body.theme.description).toBe("Dark mode theme");
      expect(body.theme.colors.primary).toBe("#1F2937");
      expect(body.theme.themeId).toBeDefined();
    });

    it("should list organization themes", async () => {
      // Create a second theme
      await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/themes`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "Light Theme",
          description: "Light mode theme",
          colors: {
            primary: "#3B82F6",
            secondary: "#10B981",
            background: "#FFFFFF",
            text: "#111827",
          },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/themes`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.themes).toHaveLength(2);
      expect(body.themes[0].name).toBe("Dark Theme");
      expect(body.themes[1].name).toBe("Light Theme");
    });

    it("should apply theme to organization", async () => {
      // Create theme first
      const themeResponse = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/themes`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "Blue Theme",
          description: "Blue color scheme",
          colors: {
            primary: "#3B82F6",
            secondary: "#60A5FA",
            background: "#EFF6FF",
            text: "#1E3A8A",
          },
        },
      });

      const themeId = themeResponse.json().theme.themeId;

      // Apply theme
      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/themes/${themeId}/apply`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.settings.customTheme.primaryColor).toBe("#3B82F6");
      expect(body.settings.customTheme.secondaryColor).toBe("#60A5FA");
    });

    it("should delete theme", async () => {
      // Create theme to delete
      const createResponse = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/themes`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "Delete Me Theme",
          colors: {
            primary: "#EF4444",
            background: "#FEE2E2",
            text: "#7F1D1D",
          },
        },
      });

      const themeId = createResponse.json().theme.themeId;

      // Delete theme
      const response = await app.inject({
        method: "DELETE",
        url: `/organizations/${org.id}/themes/${themeId}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify theme is deleted
      const listResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/themes`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const themes = listResponse.json().themes;
      expect(themes.every((t: any) => t.themeId !== themeId)).toBe(true);
    });
  });

  describe("Brand Assets Management", () => {
    it("should upload and manage brand assets", async () => {
      // Mock file upload
      const assetData = {
        name: "brand-header-image",
        type: "image",
        description: "Header image for organization website",
        category: "header",
        metadata: {
          width: 1200,
          height: 400,
          altText: "Company header",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: assetData,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.asset.name).toBe("brand-header-image");
      expect(body.asset.type).toBe("image");
      expect(body.asset.category).toBe("header");
      expect(body.asset.assetId).toBeDefined();
    });

    it("should list organization assets", async () => {
      // Upload another asset
      await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "brand-logo",
          type: "image",
          category: "logo",
          metadata: { dimensions: "200x60" },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.assets).toHaveLength(2);
      expect(body.assets[0].name).toBe("brand-header-image");
      expect(body.assets[1].name).toBe("brand-logo");
    });

    it("should filter assets by category", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
        query: {
          category: "logo",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.assets).toHaveLength(1);
      expect(body.assets[0].category).toBe("logo");
    });

    it("should update asset metadata", async () => {
      // Get asset first
      const listResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const asset = listResponse.json().assets[0];

      // Update asset
      const updateData = {
        description: "Updated header description",
        metadata: {
          ...asset.metadata,
          altText: "Updated company header",
          newField: "new value",
        },
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/assets/${asset.assetId}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.asset.description).toBe("Updated header description");
      expect(body.asset.metadata.altText).toBe("Updated company header");
      expect(body.asset.metadata.newField).toBe("new value");
    });

    it("should delete asset", async () => {
      // Get asset first
      const listResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const asset = listResponse.json().assets[0];

      // Delete asset
      const response = await app.inject({
        method: "DELETE",
        url: `/organizations/${org.id}/assets/${asset.assetId}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify asset is deleted
      const updatedList = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const assets = updatedList.json().assets;
      expect(assets.every((a: any) => a.assetId !== asset.assetId)).toBe(true);
    });
  });

  describe("Custom Domain Configuration", () => {
    it("should set custom domain for organization", async () => {
      const domainConfig = {
        domain: "branding.test.org",
        verify: false, // Skip verification for test
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/domain`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: domainConfig,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.organization.domain).toBe("branding.test.org");
    });

    it("should validate custom domain format", async () => {
      const invalidDomain = {
        domain: "invalid-domain",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/domain`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidDomain,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should remove custom domain", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/organizations/${org.id}/domain`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify domain is removed
      const orgResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const organization = orgResponse.json().organization;
      expect(organization.domain).toBeNull();
    });
  });

  describe("Branding API Endpoints", () => {
    it("should get organization branding configuration", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/branding`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.branding).toBeDefined();
      expect(body.branding.logo).toBeDefined();
      expect(body.branding.theme).toBeDefined();
      expect(body.branding.assets).toBeDefined();
    });

    it("should export branding configuration", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/branding/export`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export).toBeDefined();
      expect(body.export.version).toBeDefined();
      expect(body.export.organization).toBeDefined();
      expect(body.export.branding).toBeDefined();
      expect(body.export.assets).toBeDefined();
    });

    it("should import branding configuration", async () => {
      const importData = {
        version: "1.0",
        organization: {
          id: org.id,
          name: org.name,
        },
        branding: {
          logo: "https://cdn.example.com/imported-logo.png",
          customTheme: {
            primaryColor: "#8B5CF6",
            secondaryColor: "#10B981",
          },
        },
        assets: [],
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/branding/import`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: importData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.imported).toBe(true);
      expect(body.organization.logo).toBe("https://cdn.example.com/imported-logo.png");
    });

    it("should validate branding configuration format", async () => {
      const invalidConfig = {
        version: "1.0",
        branding: {
          customTheme: {
            primaryColor: "invalid-color",
          },
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/branding/validate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidConfig,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Branding Templates", () => {
    it("should create email template", async () => {
      const templateData = {
        name: "Welcome Email",
        type: "email",
        subject: "Welcome to {{organization.name}}!",
        htmlBody: `
          <html>
            <head>
              <style>
                .header {
                  background-color: {{organization.primaryColor}};
                  color: white;
                  padding: 20px;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <img src="{{organization.logo}}" alt="{{organization.name}}" />
              </div>
              <p>Welcome to {{organization.name}}! Your account has been created.</p>
            </body>
          </html>
        `,
        textBody: "Welcome to {{organization.name}}! Your account has been created.",
        variables: ["organization.name", "organization.logo", "organization.primaryColor"],
        isActive: true,
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/templates`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: templateData,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.template.name).toBe("Welcome Email");
      expect(body.template.type).toBe("email");
      expect(body.template.templateId).toBeDefined();
    });

    it("should render template with organization branding", async () => {
      // Create template first
      await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/templates`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "Test Template",
          type: "email",
          subject: "Test from {{organization.name}}",
          htmlBody: "<h1>{{organization.name}}</h1><p style='color: {{organization.primaryColor}}'>Hello!</p>",
          variables: ["organization.name", "organization.primaryColor"],
        },
      });

      const templateResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/templates`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const template = templateResponse.json().templates[0];

      const renderResponse = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/templates/${template.templateId}/render`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          context: {
            recipient: {
              email: "test@example.com",
              name: "Test User",
            },
          },
        },
      });

      expect(renderResponse.statusCode).toBe(200);
      const body = renderResponse.json();

      expect(body.rendered.subject).toBe(`Test from ${org.name}`);
      expect(body.rendered.htmlBody).toContain(`<h1>${org.name}</h1>`);
      expect(body.rendered.htmlBody).toContain(`style='color: #3B82F6'`);
    });

    it("should list organization templates", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/templates`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.templates).toHaveLength(1);
      expect(body.templates[0].name).toBe("Test Template");
    });
  });

  describe("Branding Security and Validation", () => {
    it("should require admin permissions for branding updates", async () => {
      const brandingUpdate = {
        logo: "https://cdn.example.com/new-logo.png",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding`,
        headers: {
          "Authorization": `Bearer ${user.token}`, // Regular user
          "Content-Type": "application/json",
        },
        payload: brandingUpdate,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should validate organization ownership", async () => {
      // Create different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: "Other Organization",
          slug: "other-org",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/organizations/${otherOrg.id}/branding`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should validate asset file types", async () => {
      const assetData = {
        name: "invalid-file",
        type: "unsupported",
        category: "general",
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/assets`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: assetData,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should enforce branding constraints", async () => {
      // Test size limits for logo
      const oversizedLogo = {
        logo: "https://example.com/very-large-image.jpg",
        logoWidth: 5000, // Exceeds typical limits
        logoHeight: 5000,
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/branding`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: oversizedLogo,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Branding Analytics and Usage", () => {
    it("should track branding usage", async () => {
      // Simulate template usage
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "template.rendered",
          meta: {
            templateId: "template-123",
            organizationId: org.id,
            type: "email",
          },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/branding/analytics`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.analytics).toBeDefined();
      expect(body.analytics.templateUsage).toBeDefined();
      expect(body.analytics.assetUsage).toBeDefined();
    });

    it("should provide brand performance metrics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/branding/metrics`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.metrics).toBeDefined();
      expect(body.metrics.assetsCount).toBeDefined();
      expect(body.metrics.templatesCount).toBeDefined();
      expect(body.metrics.lastUpdated).toBeDefined();
    });
  });
});