export function transformproduct.transformer(data: any) {
  return {
    id: data.id,
    // Add transformed fields
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  };
}

export function transformproduct.transformerList(data: any[]) {
  return data.map(transformproduct.transformer);
}
