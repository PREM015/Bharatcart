export function transformreview.transformer(data: any) {
  return {
    id: data.id,
    // Add transformed fields
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  };
}

export function transformreview.transformerList(data: any[]) {
  return data.map(transformreview.transformer);
}
