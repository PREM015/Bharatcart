# Production Environment
# Purpose: Live production infrastructure
# Description: High availability, auto-scaling, multi-AZ

terraform {
  backend "s3" {
    bucket = "bharatcart-terraform-prod"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Environment = "production"
      Project     = "BharatCart"
      CostCenter  = "Engineering"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"
  environment = "production"
  enable_nat_gateway = true
}

module "database" {
  source = "../../modules/rds"
  environment = "production"
  instance_class = "db.r6g.xlarge"
  multi_az = true
  backup_retention_period = 30
}

module "cache" {
  source = "../../modules/elasticache"
  environment = "production"
  node_type = "cache.r6g.large"
  num_cache_nodes = 3
}
