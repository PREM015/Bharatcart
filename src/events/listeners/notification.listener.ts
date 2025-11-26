import eventEmitter from '../emitter';

export function notification.listenerListener() {
  eventEmitter.on('*', (event, data) => {
    // TODO: Implement listener logic
    console.log('Event:', event, data);
  });
}
