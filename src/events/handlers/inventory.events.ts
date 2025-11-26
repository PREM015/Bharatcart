import eventEmitter from '../emitter';

export function registerinventory.eventsHandlers() {
  eventEmitter.on('inventory.events:created', (data) => {
    console.log('inventory.events created:', data);
  });

  eventEmitter.on('inventory.events:updated', (data) => {
    console.log('inventory.events updated:', data);
  });

  eventEmitter.on('inventory.events:deleted', (data) => {
    console.log('inventory.events deleted:', data);
  });
}
