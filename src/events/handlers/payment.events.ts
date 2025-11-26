import eventEmitter from '../emitter';

export function registerpayment.eventsHandlers() {
  eventEmitter.on('payment.events:created', (data) => {
    console.log('payment.events created:', data);
  });

  eventEmitter.on('payment.events:updated', (data) => {
    console.log('payment.events updated:', data);
  });

  eventEmitter.on('payment.events:deleted', (data) => {
    console.log('payment.events deleted:', data);
  });
}
