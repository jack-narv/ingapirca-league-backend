import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors:{
    origin: '*',
  },
})
export class LiveGateway {
  @WebSocketServer()
  server: Server;

  //Client joins a match room
  @SubscribeMessage('joinMatch')
  handleJoin(
    client: Socket,
    @MessageBody() matchId: string,
  ){
    client.join(`match:${matchId}`);
  }

  //Client leaves match room
  @SubscribeMessage('leaveMatch')
  handleLeave(
    client: Socket,
    @MessageBody() matchId: string,
  ){
    client.leave(`match:${matchId}`);
  }


  // === BROADCAST METHODS ===

  broadcastMatchStart(matchId: string){
    this.server
      .to(`match:${matchId}`)
      .emit('mathc_started',{matchId});
  }

  broadcastMatchEvent(matchId:string, event:any){
    this.server
      .to(`match:${matchId}`)
      .emit('match_event', event);
  }

  broadcastScoreUpdate(matchId: string, score: any){
    this.server
      .to(`match:${matchId}`)
      .emit('score_updated', score);
  }

  broadcastMatchFinish(matchId:string, data: any){
    this.server
      .to(`match:${matchId}`)
      .emit('match_finished', data);
  }
}
