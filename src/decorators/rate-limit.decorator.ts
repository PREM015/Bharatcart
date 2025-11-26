export function rate-limit.decorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    // Before
    console.log(`Calling ${propertyKey}`);
    
    const result = await originalMethod.apply(this, args);
    
    // After
    console.log(`Called ${propertyKey}`);
    
    return result;
  };

  return descriptor;
}
