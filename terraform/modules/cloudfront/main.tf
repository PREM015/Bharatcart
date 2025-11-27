# CloudFront CDN Module
# Purpose: Content Delivery Network for global asset distribution
# Description: Distributes static assets with low latency worldwide

variable "environment" {
  description = "Environment name (dev/staging/production)"
  type        = string
}

variable "s3_bucket" {
  description = "S3 bucket domain name for origin"
  type        = string
}

variable "enable_waf" {
  description = "Enable AWS WAF for DDoS protection"
  type        = bool
  default     = false
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "BharatCart CDN - ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  origin {
    domain_name = var.s3_bucket
    origin_id   = "S3-${var.s3_bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.s3_bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "bharatcart-cdn-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for BharatCart ${var.environment}"
}

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.cdn.id
}

output "domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.cdn.domain_name
}
