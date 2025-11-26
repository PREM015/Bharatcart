import eventEmitter from '../emitter';

export function registerorder.eventsHandlers() {
  eventEmitter.on('order.events:created', (data) => {
    console.log('order.events created:', data);
  });

  eventEmitter.on('order.events:updated', (data) => {
    console.log('order.events updated:', data);
  });

  eventEmitter.on('order.events:deleted', (data) => {
    console.log('order.events deleted:', data);
  });
}
