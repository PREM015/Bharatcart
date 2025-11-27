# Elasticsearch Module
# Purpose: Managed Elasticsearch for product search
# Description: Powers fast, full-text search across product catalog

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "instance_type" {
  description = "Elasticsearch instance type"
  type        = string
  default     = "t3.small.elasticsearch"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}

resource "aws_elasticsearch_domain" "search" {
  domain_name           = "bharatcart-${var.environment}"
  elasticsearch_version = "7.10"

  cluster_config {
    instance_type  = var.instance_type
    instance_count = var.instance_count
    
    zone_awareness_enabled = var.instance_count > 1

    dynamic "zone_awareness_config" {
      for_each = var.instance_count > 1 ? [1] : []
      content {
        availability_zone_count = 2
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.environment == "production" ? 100 : 20
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = var.master_user_name
      master_user_password = var.master_user_password
    }
  }

  snapshot_options {
    automated_snapshot_start_hour = 23
  }

  tags = {
    Name        = "bharatcart-search-${var.environment}"
    Environment = var.environment
  }
}

output "elasticsearch_endpoint" {
  description = "Elasticsearch domain endpoint"
  value       = aws_elasticsearch_domain.search.endpoint
}

output "elasticsearch_arn" {
  description = "Elasticsearch domain ARN"
  value       = aws_elasticsearch_domain.search.arn
}
