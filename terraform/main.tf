# --- Infrastructure (azurerm) ---

resource "azurerm_resource_group" "main" {
  name     = "rg-azure-sql-ev"
  location = "eastus"
}

resource "azurerm_mssql_server" "main" {
  name                         = "sql-ev-37851cd1"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = "westus3"
  version                      = "12.0"
  administrator_login          = var.sql_admin_user
  administrator_login_password = var.sql_admin_password

  # Password is write-only; managed out-of-band to avoid perpetual diff.
  lifecycle {
    ignore_changes = [administrator_login_password]
  }
}

resource "azurerm_storage_account" "main" {
  name                            = "stev37851cd1"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = "westus3"
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
}

resource "azurerm_service_plan" "main" {
  name                = "WestUS3LinuxDynamicPlan"
  resource_group_name = azurerm_resource_group.main.name
  location            = "westus3"
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "main" {
  name                = "func-ev-37851cd1"
  resource_group_name = azurerm_resource_group.main.name
  location            = "westus3"

  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key

  builtin_logging_enabled = false
  client_certificate_mode = "Required"

  site_config {
    application_stack {
      python_version = "3.11"
    }
    ftps_state                        = "FtpsOnly"
    http2_enabled                     = true
    ip_restriction_default_action     = "Allow"
    scm_ip_restriction_default_action = "Allow"
  }
}

resource "azurerm_static_web_app" "main" {
  name                = "swa-ev-37851cd1"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"

  sku_tier = "Free"
  sku_size = "Free"
}
