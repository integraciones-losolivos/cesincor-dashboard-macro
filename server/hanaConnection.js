import hana from '@sap/hana-client'

const requiredEnv = ['HANA_HOST', 'HANA_PORT', 'HANA_USER', 'HANA_PASSWORD', 'HANA_SCHEMA']

export function assertHanaConfig() {
  const missing = requiredEnv.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Faltan variables de entorno para SAP HANA: ${missing.join(', ')}`)
  }
}

function connectOnce() {
  const connection = hana.createConnection()
  const options = {
    serverNode: `${process.env.HANA_HOST}:${process.env.HANA_PORT}`,
    uid: process.env.HANA_USER,
    pwd: process.env.HANA_PASSWORD,
    encrypt: String(process.env.HANA_ENCRYPT || 'false').toLowerCase() === 'true',
    sslValidateCertificate: String(process.env.HANA_SSL_VALIDATE_CERTIFICATE || 'false').toLowerCase() === 'true',
  }

  return new Promise((resolve, reject) => {
    connection.connect(options, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(connection)
    })
  })
}

export async function connectHana() {
  assertHanaConfig()

  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await connectOnce()
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
      }
    }
  }

  throw new Error(`SAP HANA no respondió después de 3 intentos. ${lastError?.message || ''}`.trim())
}

export function executeQuery(connection, sql) {
  return new Promise((resolve, reject) => {
    connection.exec(sql, (error, rows) => {
      if (error) {
        reject(error)
        return
      }
      resolve(rows)
    })
  })
}
