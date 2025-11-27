# Lambda Functions Module
# Purpose: Serverless functions for background processing
# Description: Image processing, email sending, async tasks

variable "environment" {
  description = "Environment name"
  type        = string
}

# Image Processor Function
resource "aws_lambda_function" "image_processor" {
  function_name = "bharatcart-image-processor-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 1024

  filename         = "lambda/image-processor.zip"
  source_code_hash = filebase64sha256("lambda/image-processor.zip")

  environment {
    variables = {
      ENVIRONMENT = var.environment
      S3_BUCKET   = "bharatcart-uploads-${var.environment}"
    }
  }

  tags = {
    Name        = "image-processor"
    Environment = var.environment
  }
}

# Email Sender Function
resource "aws_lambda_function" "email_sender" {
  function_name = "bharatcart-email-sender-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 512

  filename         = "lambda/email-sender.zip"
  source_code_hash = filebase64sha256("lambda/email-sender.zip")

  environment {
    variables = {
      SES_REGION = "us-east-1"
      FROM_EMAIL = "noreply@bharatcart.com"
    }
  }

  tags = {
    Name        = "email-sender"
    Environment = var.environment
  }
}

# Order Processor Function
resource "aws_lambda_function" "order_processor" {
  function_name = "bharatcart-order-processor-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 512

  filename         = "lambda/order-processor.zip"
  source_code_hash = filebase64sha256("lambda/order-processor.zip")

  environment {
    variables = {
      DATABASE_URL = var.database_url
    }
  }

  tags = {
    Name        = "order-processor"
    Environment = var.environment
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "lambda-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

output "image_processor_arn" {
  description = "Image processor Lambda ARN"
  value       = aws_lambda_function.image_processor.arn
}

output "email_sender_arn" {
  description = "Email sender Lambda ARN"
  value       = aws_lambda_function.email_sender.arn
}
