# Staging Environment
# Purpose: Pre-production testing environment
# Description: Production-like setup with smaller capacity

terraform {
  backend "s3" {
    bucket = "bharatcart-terraform-staging"
    key    = "staging/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Environment = "staging"
      Project     = "BharatCart"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"
  environment = "staging"
}

module "database" {
  source = "../../modules/rds"
  environment = "staging"
  instance_class = "db.t3.medium"
  multi_az = true
}
