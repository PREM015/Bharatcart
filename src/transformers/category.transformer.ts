export function transformcategory.transformer(data: any) {
  return {
    id: data.id,
    // Add transformed fields
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  };
}

export function transformcategory.transformerList(data: any[]) {
  return data.map(transformcategory.transformer);
}
