export function createMockFile(
  content: string,
  name: string,
  type: string
): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

export function createMockCSVFile(content: string, name = 'test.csv'): File {
  return createMockFile(content, name, 'text/csv')
}

export function createMockJSONFile(data: object, name = 'backup.json'): File {
  return createMockFile(JSON.stringify(data), name, 'application/json')
}
