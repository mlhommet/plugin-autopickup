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

  autoPickup = (manager) => manager.workerClient.attributes["Membership"] === "Bluelink";
  
  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    const resStatus = ["accepted","canceled","rejected","rescinded","timeout"];
    let bipSound = "https://prune-porpoise-1444.twil.io/assets/mixkit-censorship-beep-1082.wav";
    let ringSound = "https://bittersweet-fly-6115.twil.io/assets/mixkit-marimba-ringtone-1359.wav";
    let mediaId;
    
    this.registerReducers(manager);

    manager.workerClient.on("reservationCreated", reservation => {

      // Autopickup for inbound calls only - this conflicts with the outbound call plugin
      if (reservation.task.taskChannelUniqueName.toLowerCase() === 'voice' && reservation.task.attributes.direction === 'inbound') {
        mediaId = flex.AudioPlayerManager.play({
          url: this.autoPickup(manager) ? bipSound : ringSound,
          repeatable: this.autoPickup(manager) ? false : true
        },
        (error) => {
          //handle error
          console.log("ERROR", error);
        }
        );
        // Autopickup for bluelink agents
        if (this.autoPickup(manager)){
          // use a timeout to ensure the bip is done playing when the conversation starts
          setTimeout(()=> {
            this.acceptAndSelectTaskAction(flex, reservation);
          }, 1000);
        }
      }

      resStatus.forEach( (e)=>{
        reservation.on(e,()=>{
          flex.AudioPlayerManager.stop(mediaId);
        })
      })
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
