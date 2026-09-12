# --- Azure SQL Database (free offer) via AzAPI ---
# `azurerm_mssql_database` does not expose `use_free_limit` /
# `free_limit_exhaustion_behavior`, so the free-offer database is managed
# with the AzAPI provider against the raw ARM API.

resource "azapi_resource" "database" {
  type      = "Microsoft.Sql/servers/databases@2025-02-01-preview"
  name      = "EVPopulationDB"
  parent_id = azurerm_mssql_server.main.id
  location  = "westus3"

  body = {
    sku = {
      name     = "GP_S_Gen5"
      tier     = "GeneralPurpose"
      capacity = 1
      family   = "Gen5"
    }
    properties = {
      useFreeLimit                = true
      freeLimitExhaustionBehavior = "AutoPause"
      minCapacity                 = 0.5
      autoPauseDelay              = 60
    }
  }

  response_export_values = ["id"]

  lifecycle {
    # API-computed fields that would otherwise cause perpetual drift.
    ignore_changes = [
      body.sku.name,
      body.properties.availabilityZone,
      body.properties.catalogCollation,
      body.properties.collation,
      body.properties.isLedgerOn,
      body.properties.maintenanceConfigurationId,
      body.properties.maxSizeBytes,
      body.properties.readScale,
      body.properties.requestedBackupStorageRedundancy,
      body.properties.zoneRedundant,
    ]
  }
}
