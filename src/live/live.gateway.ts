import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const socketCorsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

@WebSocketGateway({
  cors:{
    origin: socketCorsOrigins.length > 0 ? socketCorsOrigins : true,
  },
})
export class LiveGateway {
  @WebSocketServer()
  server: Server;

  //Client joins a match room
  @SubscribeMessage('joinMatch')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ){
    client.join(`match:${matchId}`);
  }

  //Client leaves match room
  @SubscribeMessage('leaveMatch')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ){
    client.leave(`match:${matchId}`);
  }


  // === BROADCAST METHODS ===

  broadcastMatchStart(matchId: string){
    this.server
      .to(`match:${matchId}`)
      .emit('match_started', {
        matchId,
        status: 'PLAYING_FIRST_HALF',
        startedAt: new Date(),
      });
  }

  broadcastMatchEvent(matchId:string, event:any){
    this.server
      .to(`match:${matchId}`)
      .emit('match_event', event);
  }

  broadcastHalfTime(matchId: string){
    this.server
      .to(`match:${matchId}`)
      .emit('match_half_time', {
        matchId,
        status: 'HALF_TIME',
        halfTimeAt: new Date(),
      });
  }

  broadcastSecondHalfStart(matchId: string){
    this.server
      .to(`match:${matchId}`)
      .emit('match_second_half_started', {
        matchId,
        status: 'PLAYING_SECOND_HALF',
        startedAt: new Date(),
      });
  }

  broadcastScoreUpdate(matchId: string, score: any){
    this.server
      .to(`match:${matchId}`)
      .emit('score_updated', score);
  }

  broadcastMatchFinish(matchId:string, data: any){
    this.server
      .to(`match:${matchId}`)
      .emit('match_finished', {
      matchId,
      ...data,
      status: 'PLAYED',
      finishedAt: new Date(),
    });
  }
}
