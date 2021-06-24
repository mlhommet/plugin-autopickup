import React from 'react';
import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';

import reducers, { namespace } from './states';

const PLUGIN_NAME = 'AutopickupPlugin';


export default class AutopickupPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * Util function that chains the Accept and Select task and prevents race conditions
   */
  acceptAndSelectTaskAction = async (flex, reservation) => {
    if (reservation) {
        const sid = reservation.reservationSid ?? reservation.sid;
        await flex.Actions.invokeAction('AcceptTask', { sid });
        await flex.Actions.invokeAction('SelectTask', { sid });
        return Promise.resolve();
    }
    return Promise.reject('Could not find Task or ReservationSid to accept.');
  };

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    this.registerReducers(manager);

    //Pick-up the customer call automatically for voice channel
		manager.workerClient.on("reservationCreated", reservation => {
      var channel = reservation.task.taskChannelUniqueName.toLowerCase();
      // Autopickup for inbound calls only - this conflicts with the outbound call plugin
      if (channel === 'voice' && reservation.task.attributes.direction === 'inbound') {
        this.acceptAndSelectTaskAction(flex,reservation);
      }
    });

  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint: disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }
    manager.store.addReducer(namespace, reducers);
  }
}
