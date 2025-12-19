# TempMail Pro Multi-Region Infrastructure
# AWS Provider configuration for multiple regions

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Primary region (US-East-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# EU region (EU-West-1)
provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

# APAC region (AP-Southeast-1)
provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"
}

# Variables
variable "project_name" {
  description = "Project name"
  type        = string
  default     = "tempmail-pro"
}

variable "environment" {
  description = "Environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "tempmail.pro"
}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC in US-East-1 (Primary)
module "vpc_us_east" {
  source = "../../modules/vpc"

  providers = {
    aws = aws.us_east_1
  }

  region           = "us-east-1"
  name_prefix      = "${local.name_prefix}-us-east"
  cidr             = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets  = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

  tags = local.tags
}

# VPC in EU-West-1 (Secondary)
module "vpc_eu_west" {
  source = "../../modules/vpc"

  providers = {
    aws = aws.eu_west_1
  }

  region           = "eu-west-1"
  name_prefix      = "${local.name_prefix}-eu-west"
  cidr             = "10.1.0.0/16"
  availability_zones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  public_subnets   = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  private_subnets  = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
  database_subnets = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]

  tags = local.tags
}

# VPC in AP-Southeast-1 (Tertiary)
module "vpc_ap_southeast" {
  source = "../../modules/vpc"

  providers = {
    aws = aws.ap_southeast_1
  }

  region           = "ap-southeast-1"
  name_prefix      = "${local.name_prefix}-ap-southeast"
  cidr             = "10.2.0.0/16"
  availability_zones = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
  public_subnets   = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
  private_subnets  = ["10.2.11.0/24", "10.2.12.0/24", "10.2.13.0/24"]
  database_subnets = ["10.2.21.0/24", "10.2.22.0/24", "10.2.23.0/24"]

  tags = local.tags
}

# RDS PostgreSQL Cluster (Primary in US-East)
module "rds_primary" {
  source = "../../modules/rds"

  providers = {
    aws = aws.us_east_1
  }

  name_prefix     = "${local.name_prefix}-primary"
  vpc_id          = module.vpc_us_east.vpc_id
  subnet_group_id = module.vpc_us_east.database_subnet_group_id
  security_groups = [module.security_us_east.rds_security_group_id]

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted    = true
  storage_type         = "io1"
  iops                 = 3000

  database_name = "tempmail_pro"
  username      = "tempmail_admin"
  password      = var.db_password

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"

  tags = local.tags
}

# RDS Read Replicas
module "rds_replica_eu" {
  source = "../../modules/rds"

  providers = {
    aws = aws.eu_west_1
  }

  name_prefix     = "${local.name_prefix}-replica-eu"
  vpc_id          = module.vpc_eu_west.vpc_id
  subnet_group_id = module.vpc_eu_west.database_subnet_group_id
  security_groups = [module.security_eu_west.rds_security_group_id]

  # Replica configuration
  replicate_source_db = module.rds_primary.instance_arn
  instance_class     = "db.r6g.large"

  publicly_accessible = false

  tags = local.tags
}

module "rds_replica_apac" {
  source = "../../modules/rds"

  providers = {
    aws = aws.ap_southeast_1
  }

  name_prefix     = "${local.name_prefix}-replica-apac"
  vpc_id          = module.vpc_ap_southeast.vpc_id
  subnet_group_id = module.vpc_ap_southeast.database_subnet_group_id
  security_groups = [module.security_ap_southeast.rds_security_group_id]

  # Replica configuration
  replicate_source_db = module.rds_primary.instance_arn
  instance_class     = "db.r6g.large"

  publicly_accessible = false

  tags = local.tags
}

# ElastiCache Redis Cluster (Primary)
module "redis_primary" {
  source = "../../modules/redis"

  providers = {
    aws = aws.us_east_1
  }

  name_prefix     = "${local.name_prefix}-redis-primary"
  vpc_id          = module.vpc_us_east.vpc_id
  subnet_group_id = module.vpc_us_east.cache_subnet_group_id
  security_groups = [module.security_us_east.redis_security_group_id]

  node_type         = "cache.r6g.large"
  num_cache_nodes   = 3
  port              = 6379
  automatic_failover = true

  tags = local.tags
}

# Global Redis Replication Groups
module "redis_global" {
  source = "../../modules/redis-global"

  primary_region = "us-east-1"
  replica_regions = ["eu-west-1", "ap-southeast-1"]

  primary_cluster_id = module.redis_primary.cluster_id

  global_replication_group_id = "${local.name_prefix}-global"

  tags = local.tags
}

# ECS Cluster for Application Services
module "ecs_cluster_us_east" {
  source = "../../modules/ecs"

  providers = {
    aws = aws.us_east_1
  }

  name_prefix = "${local.name_prefix}-us-east"
  vpc_id       = module.vpc_us_east.vpc_id

  instance_type = "m6g.large"
  min_size      = 3
  max_size      = 20
  desired_size  = 5

  tags = local.tags
}

# ECS Cluster in other regions
module "ecs_cluster_eu_west" {
  source = "../../modules/ecs"

  providers = {
    aws = aws.eu_west_1
  }

  name_prefix = "${local.name_prefix}-eu-west"
  vpc_id       = module.vpc_eu_west.vpc_id

  instance_type = "m6g.large"
  min_size      = 2
  max_size      = 10
  desired_size  = 3

  tags = local.tags
}

module "ecs_cluster_ap_southeast" {
  source = "../../modules/ecs"

  providers = {
    aws = aws.ap_southeast_1
  }

  name_prefix = "${local.name_prefix}-ap-southeast"
  vpc_id       = module.vpc_ap_southeast.vpc_id

  instance_type = "m6g.large"
  min_size      = 2
  max_size      = 10
  desired_size  = 3

  tags = local.tags
}

# Application Load Balancers
module "alb_us_east" {
  source = "../../modules/alb"

  providers = {
    aws = aws.us_east_1
  }

  name_prefix = "${local.name_prefix}-us-east"
  vpc_id       = module.vpc_us_east.vpc_id
  subnets      = module.vpc_us_east.public_subnet_ids

  security_groups = [module.security_us_east.alb_security_group_id]

  enable_deletion_protection = true

  tags = local.tags
}

# Route 53 Health Checks
resource "aws_route53_health_check" "api_us_east" {
  provider = aws.us_east_1

  fqdn                            = "${module.alb_us_east.dns_name}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_logs_region          = "us-east-1"
  cloudwatch_alarm_region         = "us-east-1"
  cloudwatch_alarm_name           = "${local.name_prefix}-us-east-health"
  insufficient_data_health_status = "Failure"
  inverted                        = false
}

resource "aws_route53_health_check" "api_eu_west" {
  provider = aws.eu_west_1

  fqdn                            = "${module.alb_eu_west.dns_name}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_logs_region          = "eu-west-1"
  cloudwatch_alarm_region         = "eu-west-1"
  cloudwatch_alarm_name           = "${local.name_prefix}-eu-west-health"
  insufficient_data_health_status = "Failure"
  inverted                        = false
}

resource "aws_route53_health_check" "api_ap_southeast" {
  provider = aws.ap_southeast_1

  fqdn                            = "${module.alb_ap_southeast.dns_name}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_logs_region          = "ap-southeast-1"
  cloudwatch_alarm_region         = "ap-southeast-1"
  cloudwatch_alarm_name           = "${local.name_prefix}-ap-southeast-health"
  insufficient_data_health_status = "Failure"
  inverted                        = false
}

# Route 53 Records with Latency-Based Routing
resource "aws_route53_record" "api_primary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "us-east-1"

  alias {
    name                   = module.alb_us_east.dns_name
    zone_id               = module.alb_us_east.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.api_us_east.id
  latency_based_routing {
    region = "us-east-1"
  }
}

resource "aws_route53_record" "api_eu" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "eu-west-1"

  alias {
    name                   = module.alb_eu_west.dns_name
    zone_id               = module.alb_eu_west.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.api_eu_west.id
  latency_based_routing {
    region = "eu-west-1"
  }
}

resource "aws_route53_record" "api_apac" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "ap-southeast-1"

  alias {
    name                   = module.alb_ap_southeast.dns_name
    zone_id               = module.alb_ap_southeast.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.api_ap_southeast.id
  latency_based_routing {
    region = "ap-southeast-1"
  }
}

# Default record (primary region)
resource "aws_route53_record" "api_default" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "primary"

  alias {
    name                   = module.alb_us_east.dns_name
    zone_id               = module.alb_us_east.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.api_us_east.id
  failover_routing_policy {
    type = "PRIMARY"
  }
}

# S3 Buckets for Cross-Region Replication
module "s3_primary" {
  source = "../../modules/s3"

  providers = {
    aws = aws.us_east_1
  }

  name_prefix = "${local.name_prefix}-primary"

  versioning = true

  lifecycle_rule = [{
    id     = "expire_uploads"
    status = "Enabled"
    filter = {}
    transition = [
      {
        days          = 30
        storage_class = "STANDARD_IA"
      },
      {
        days          = 60
        storage_class = "GLACIER"
      }
    ]
    expiration = {
      days = 365
    }
  }]

  tags = local.tags
}

# Replication buckets
module "s3_replica_eu" {
  source = "../../modules/s3"

  providers = {
    aws = aws.eu_west_1
  }

  name_prefix = "${local.name_prefix}-replica-eu"

  versioning = true

  tags = local.tags
}

module "s3_replica_apac" {
  source = "../../modules/s3"

  providers = {
    aws = aws.ap_southeast_1
  }

  name_prefix = "${local.name_prefix}-replica-apac"

  versioning = true

  tags = local.tags
}

# S3 Cross-Region Replication Configuration
resource "aws_s3_bucket_replication_configuration" "primary_replication" {
  provider = aws.us_east_1

  role   = aws_iam_role.s3_replication.arn
  bucket = module.s3_primary.bucket_id

  rules = [
    {
      id = "eu_replica"
      status = "Enabled"
      destination {
        bucket        = module.s3_replica_eu.bucket_arn
        storage_class = "STANDARD"
        account       = data.aws_caller_identity.current.account_id
      }
      filter = {}
    },
    {
      id = "apac_replica"
      status = "Enabled"
      destination {
        bucket        = module.s3_replica_apac.bucket_arn
        storage_class = "STANDARD"
        account       = data.aws_caller_identity.current.account_id
      }
      filter = {}
    }
  ]
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "api_distribution" {
  enabled = true
  is_ipv6_enabled = true

  comment = "${local.name_prefix} API Distribution"
  default_root_object = "index.html"

  price_class = "PriceClass_All"

  # Origin configurations for each region
  origin {
    domain_name = module.alb_us_east.dns_name
    origin_id   = "us-east-1"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    connection_attempts = 3
    connection_timeout   = 10
  }

  origin {
    domain_name = module.alb_eu_west.dns_name
    origin_id   = "eu-west-1"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    connection_attempts = 3
    connection_timeout   = 10
  }

  origin {
    domain_name = module.alb_ap_southeast.dns_name
    origin_id   = "ap-southeast-1"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    connection_attempts = 3
    connection_timeout   = 10
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "us-east-1"
    compress              = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 300
  }

  # Cache behaviors for different paths
  ordered_cache_behavior = [
    {
      path_pattern           = "/api/*"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD", "OPTIONS"]
      target_origin_id       = "us-east-1"
      compress               = true
      viewer_protocol_policy = "https-only"

      forwarded_values {
        query_string = true
        headers      = ["*"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    },
    {
      path_pattern           = "/static/*"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD", "OPTIONS"]
      target_origin_id       = "us-east-1"
      compress               = true
      viewer_protocol_policy = "https-only"

      forwarded_values {
        query_string = false
        cookies {
          forward = "none"
        }
      }

      min_ttl     = 86400
      default_ttl = 86400
      max_ttl     = 31536000
    }
  ]

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2"
  }

  # Logging
  logging_config {
    include_cookies = false
    bucket          = "${module.s3_primary.bucket_id}-logs"
    prefix          = "cloudfront-logs/"
  }

  tags = local.tags
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "api_oai" {
  comment = "${local.name_prefix} API OAI"
}

# Data sources
data "aws_route53_zone" "main" {
  name = var.domain_name
}

data "aws_caller_identity" "current" {}

# Variables for sensitive data
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "ssl_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  type        = string
  default     = ""
}

# Outputs
output "vpc_ids" {
  description = "VPC IDs for all regions"
  value = {
    us_east_1    = module.vpc_us_east.vpc_id
    eu_west_1    = module.vpc_eu_west.vpc_id
    ap_southeast_1 = module.vpc_ap_southeast.vpc_id
  }
}

output "rds_endpoint" {
  description = "Primary RDS endpoint"
  value       = module.rds_primary.endpoint
}

output "redis_endpoint" {
  description = "Primary Redis endpoint"
  value       = module.redis_primary.primary_endpoint
}

output "alb_dns_names" {
  description = "ALB DNS names for all regions"
  value = {
    us_east_1    = module.alb_us_east.dns_name
    eu_west_1    = module.alb_eu_west.dns_name
    ap_southeast_1 = module.alb_ap_southeast.dns_name
  }
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.api_distribution.domain_name
}