# Development Environment
# Purpose: Dev infrastructure in AWS
# Description: Small instances for development testing

terraform {
  required_version = ">= 1.0"
  backend "s3" {
    bucket = "bharatcart-terraform-dev"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Environment = "development"
      Project     = "BharatCart"
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Configuration
module "vpc" {
  source = "../../modules/vpc"
  environment = "dev"
  vpc_cidr = "10.0.0.0/16"
}

# Database
module "database" {
  source = "../../modules/rds"
  environment = "dev"
  instance_class = "db.t3.micro"
}

# Cache
module "cache" {
  source = "../../modules/elasticache"
  environment = "dev"
  node_type = "cache.t3.micro"
}

# Storage
module "storage" {
  source = "../../modules/s3"
  environment = "dev"
}
