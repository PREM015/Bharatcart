export function transformcart.transformer(data: any) {
  return {
    id: data.id,
    // Add transformed fields
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  };
}

export function transformcart.transformerList(data: any[]) {
  return data.map(transformcart.transformer);
}
