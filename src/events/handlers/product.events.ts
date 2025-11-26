import eventEmitter from '../emitter';

export function registerproduct.eventsHandlers() {
  eventEmitter.on('product.events:created', (data) => {
    console.log('product.events created:', data);
  });

  eventEmitter.on('product.events:updated', (data) => {
    console.log('product.events updated:', data);
  });

  eventEmitter.on('product.events:deleted', (data) => {
    console.log('product.events deleted:', data);
  });
}
