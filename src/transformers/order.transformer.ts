export function transformorder.transformer(data: any) {
  return {
    id: data.id,
    // Add transformed fields
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  };
}

export function transformorder.transformerList(data: any[]) {
  return data.map(transformorder.transformer);
}
