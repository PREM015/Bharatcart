import eventEmitter from '../emitter';

export function registeruser.eventsHandlers() {
  eventEmitter.on('user.events:created', (data) => {
    console.log('user.events created:', data);
  });

  eventEmitter.on('user.events:updated', (data) => {
    console.log('user.events updated:', data);
  });

  eventEmitter.on('user.events:deleted', (data) => {
    console.log('user.events deleted:', data);
  });
}
