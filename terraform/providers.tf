terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-azure-sql-ev"
    storage_account_name = "stev37851cd1"
    container_name       = "tfstate"
    key                  = "azure-sql-ev.tfstate"
  }
}

provider "azurerm" {
  features {}
}

provider "azapi" {}
