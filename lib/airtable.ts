import Airtable from 'airtable'

const apiKey =
  process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY

if (!apiKey) {
  throw new Error('Missing AIRTABLE_PERSONAL_ACCESS_TOKEN or AIRTABLE_API_KEY')
}

if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('Missing AIRTABLE_BASE_ID')
}

const base = new Airtable({
  apiKey,
}).base(process.env.AIRTABLE_BASE_ID)

export default base