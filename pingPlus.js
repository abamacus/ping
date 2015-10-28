/* Joel Elliott, November 2013 */
/* NEXT STOP: implement "block" objects, use as the walls instead of arbitrarily checking ball position against constant values
 AND THEN: implement "trap" object, use as the bottom wall to destroy the ball
 TODO: paddle's position should be its center, not its top-center
 note: if object goes "out of bounds" in any direction, it should "teleport" to the other side, this is a "spherical" universe
 Ideas for more "simulation":
  straight collision detection:
    all objects should have position (center of object) & width & height
    within range is: (x1-x2<(w1+w2)/2) && (y1-y2<(h1+h2)/2)
  special collision detection -- if two objects are within range of each other, extra checking needed:
    this would at minimum allow objects to be "spherical" or not
    if "spherical", check for collision of actual edges
    what other objects to support?
      polygons - pretty complex, but probably worth it. Would allow for diamonds, triangles etc.
      quadratic/bezier/etc - I think this will be way too hard
  tricky bits -- all of these problems will arise if we allow moving objects to interact with each other:
    deflection - what about determining the correct angle of reflection? extra difficult for spherical objects
    overlap    - if two objects are overlapping, does one (or both) get "placed" out of the way instantly? if so, how do we make sure both objects are evaluated for the collision?
    speed      - should speed be changeable? if two balls hit at different speeds, can their speeds change?
    momentum   - if so, what about mass? if a large object hits a small one, do they both bounce off equally, or does the smaller bounce off and the larger just slow down?
    spin       - can an object have a "spin"? if two squares collide they should (likely) get a spin...
                 to show spin, would need to have non-uniform drawings (x on the circle or something)
                 if has spin, colliding with wall would cause change in direction, and reduce spin
                 objects would probably need "friction" values to support how much spin interacts on collision
                 if allow, definitely allow a moving paddle to give spin to object
                 would spin cause movement through the "air" to alter course (and thereby slowly decrease the spin)?
*/
function GetCursorPosition(event){
/* This event is intended only for a mouse event on a canvas element.
   It will set properties pixelX and pixelY of the canvas to wherever the mouse/cursor is located. */
  var eventCanvasElement = event.target;
  if (eventCanvasElement.borderSet == null) { // to save a few cycles, only compute the border size once
    // we will assume that the padding+border+margin is equal around the object, partly because I don't know how to tell if it's not
    eventCanvasElement.borderWidth  = (eventCanvasElement.offsetWidth  - eventCanvasElement.width )/2;
    eventCanvasElement.borderHeight = (eventCanvasElement.offsetHeight - eventCanvasElement.height)/2;
	eventCanvasElement.borderSet = true;
  }
  // get pixel location, relative to top-left corner of canvas
  eventCanvasElement.pixelX = event.layerX - eventCanvasElement.offsetLeft - eventCanvasElement.borderWidth ;
  eventCanvasElement.pixelY = event.layerY - eventCanvasElement.offsetTop  - eventCanvasElement.borderHeight;
}

function PingPlusGame() {
  this.frontCanvas = $('frontCanvas');
  this.backCanvas  = $('backCanvas');
  this.frontContext = this.frontCanvas.getContext('2d');
  this.backContext  = this.backCanvas.getContext('2d');

  function Wall(position,width,height,color) {
this.position = (position != null) ? position : new Position(0,0);
this.width    = (width    != null) ? width    : 1;
this.height   = (height   != null) ? height   : 1;
this.color    = (color    != null) ? color    : '#fff';
Wall.prototype.toString = function(){return 'Wall{position: ' + this.position.toString() + ', width: ' + this.width + ', height: ' + this.height + ', color: ' + this.color + '}';}
}
xx = new Wall();


  function MouseCursor(top,right,bottom,left,canvas) {
    this.top    = top;
    this.right  = right;
    this.bottom = bottom;
    this.left   = left;
    this.width = Math.abs(this.right - this.left);
    this.height = Math.abs(this.bottom - this.top);
    // default the starting point to the center, it will changes as soon as a mouse event happens
    this.position = new Position((left+right)/2,(top+bottom)/2);
    this.eventCanvas = canvas;
    MouseCursor.prototype.Move = function(){
      if (this.eventCanvas.pixelX == null) {
        return;
      }
      this.position.x = this.eventCanvas.pixelX / this.eventCanvas.width  * (this.width ) + this.left;
      this.position.y = this.eventCanvas.pixelY / this.eventCanvas.height * (this.height) + this.top ;
      // if cursor is out of bounds, set value to min/max instead
      if (this.position.x < this.left) { this.position.x = this.left; }
      else if (this.position.x > this.right) { this.position.x = this.right; }
      if (this.position.y < this.top) { this.position.y = this.top; }
      else if (this.position.y > this.bottom) { this.position.y = this.bottom; }
    }
  }
  function Ball(position,vector,size,color) {
    this.position = (position == null) ? new Position(0,0) : position;
    this.vector = (vector == null) ? new Vector(0,0) : vector;
    this.size = (size == null) ? 1 : size;
    this.color = (color == null) ? 'rgba(255,255,255,1)' : color;
    Ball.prototype.Move = function(moments){
      var v;
      if (moments == null) {
        v = this.vector;
      } else {
        v = this.vector.Times(moments);
      }
      this.position.AddVector(v);
    }
    Ball.prototype.Draw = function(ctx){
      ctx.beginPath();
      ctx.arc(this.position.x,this.position.y,this.size,0,Math.PI*2);
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    Ball.prototype.toString = function(){return 'Ball{position: ' + this.position.toString() + ', vector: ' + this.vector.toString() + ', size: ' + this.size + ', color: ' + this.color + '}';}
  }

  function Paddle(position,width,height,color) {
    this.position = (position == null) ? new Position(0,0) : position;
    this.width    = (width    == null) ? 25 : width;
    this.height   = (height   == null) ? 25 : height;
    this.color    = (color    == null) ? 'rgba(255,255,255,1)' : color;
    this.feature  = null;
    /* description of planned feature values (mostly not implemented at this time)
    normal: paddle is a bowed rectangle, restricted to bottom wall, curve causes directional bouncing
    "good" features:
    vector - draw line showing the angle that the ball(s) would bounce off if hit
    free   - paddle can move away from the bottom wall
    spider - paddle can move along any wall (can help direct ball into hard-to-reach places)
    glue   - ball sticks to paddle (until user clicks)
    large  - width is doubled
    magnet - ball is pulled towards center of paddle (direction only, ball speed does not change)
    "bad" features:
    square - paddle becomes a square instead of a rectangle, smaller width & taller, "bow" is removed (bounces off like a wall)
    small  - width is halved
    slow   - paddle speed is limited, does not move instantly with mouse
    */
    Paddle.prototype.Move = function(){
      // the paddle has no default movement (normally it tracks the cursor)
      // TODO - need to put this boundary check in somewhere...
      //if (this.cursorX != this.position.x) {
      //  this.position.x = this.cursorX;
      //  if (this.position.x > this.right - this.width/2) {
      //    this.position.x = this.right - this.width/2;
      //  }
      //  if (this.position.x < this.left + this.width/2) {
      //    this.position.x = this.left + this.width/2;
      //  }
      //}
    }
    Paddle.prototype.Draw = function(ctx){
      ctx.fillStyle=this.color;
      ctx.beginPath();
      ctx.moveTo(this.position.x - this.width/2,this.position.y+this.height/2);
      ctx.lineTo(this.position.x - this.width/2,this.position.y);
      ctx.quadraticCurveTo(this.position.x - this.width/2,
                           this.position.y - this.height/2,this.position.x,this.position.y - this.height/2);
      ctx.quadraticCurveTo(this.position.x + this.width/2,this.position.y - this.height/2,
                           this.position.x + this.width/2,this.position.y);
      ctx.lineTo(this.position.x + this.width/2,this.position.y+this.height/2);
      ctx.closePath();
      ctx.fill();
    }
    Paddle.prototype.toString = function(){return 'Paddle{position: ' + this.position.toString() + ', width: ' + this.width + ', height: ' + this.height + ', color: ' + this.color + '}'}
  }

  PingPlusGame.prototype.DrawForeText = function(){
    this.frontContext.clearRect(this.left,this.top,this.width,this.height); /* blank the canvas before drawing */
    if (this.gameMessage == null) { return; }

    this.frontContext.textAlign = 'center';
    this.frontContext.textBaseline = 'middle';
    this.frontContext.fillStyle='rgba(255,255,255,1)';
  
    theseGameMessages = this.gameMessage.split('\n');
    for ( i = 0 ; i < theseGameMessages.length ; ++i ){
      var thisGameMessage = theseGameMessages[i];

      this.frontContext.font = '32px verdana';
      var withAt32px = this.frontContext.measureText(thisGameMessage).width;
      if (withAt32px > this.width) { // resize text to fit in the window
        var emSize = 32 * this.width / withAt32px * 0.95;
  	  this.frontContext.font = emSize.toFixed(1) + 'px verdana';
      }
      var step = this.height / (theseGameMessages.length + 1);
      var messageHeight = step * (i + 1) + this.top;
      this.frontContext.fillText(thisGameMessage,this.width/2+this.left,messageHeight);
    }  
  }
  PingPlusGame.prototype.DrawBackText = function(){
    this.backContext.clearRect(this.left,this.top,this.width,this.height); /* blank the canvas before drawing */
    this.backContext.font = '64px verdana';
    this.backContext.textAlign = 'center';
    this.backContext.textBaseline = 'middle';
    this.backContext.fillStyle='rgba(0,0,255,0.25)';
    this.backContext.fillText(this.difficultyLevel,this.left + this.width/2,this.top + this.height/2);
  }
  PingPlusGame.prototype.Draw = function(){
    this.backContext.clearRect(this.left,this.top,this.width,this.height);
    this.DrawForeText();
    this.DrawBackText();
    for ( i = 0 ; i < this.sprites.length ; ++i ){
      var sprite = this.sprites[i]
      if (typeof(sprite.Draw) == 'function'){
        sprite.Draw(this.backContext);
      }
    }
  }
  PingPlusGame.prototype.IncreaseDifficulty = function(){
    /* with the current balance:
         0- 50 easy
        50-100 medium
       100-150 hard
       150+    insane */
    this.difficultyLevel += 1;
  }
  PingPlusGame.prototype.MoveSprite = function(sprite){
    if (typeof(sprite.Move) == 'function'){
      sprite.Move();
    }
    if (sprite instanceof Ball) {
      this.CheckCollision(sprite);
    }
  }
  PingPlusGame.prototype.CheckCollision = function(ball){
    var hitWall = false;
    if (ball.vector.Right()) { // travelling right, check if "hit" right wall
      if (ball.position.x > this.right - ball.size) {hitWall = true}
    } else { // travelling left, check if "hit" left wall
      if (ball.position.x < this.left + ball.size) {hitWall = true}
    }
    if (hitWall) {
      ball.vector.ReflectX();
      // randomize the direction by up to a degree in either direction
      ball.vector.RandomDegrees(2);
    }
    var thisPaddle = this.paddle;
    var hitWall = false;
    if (ball.vector.Down()) { // travelling down, check if "hit" paddle
      if (ball.position.y > this.bottom - ball.size - thisPaddle.height) { // in range of being able to hit the paddle
        var centerDifference = Math.abs(ball.position.x - thisPaddle.position.x);
        if (centerDifference <= thisPaddle.width/2 + ball.size) { // we have contact
          //hitWall = true;
          /* We want to cause the bounce to affect the X speed, like the paddle is curved.
             Hitting on the left side makes the ball travel more to the left, and vice versa.
             To do this, determine an angle (in radians) that the paddle has at the point of impact.
             Then bouce off of that angle. */ 

          // let the left edge of the paddle be PI(1/4), and right edge be PI(3/4).
          // (and have to invert due to +Y is "down")
          var paddleRatio = (ball.position.x - thisPaddle.position.x + thisPaddle.width/2) / thisPaddle.width;
          var paddleX = (paddleRatio/2 - 1/4);
          var paddleAngle = Math.PI * paddleX;
          ball.vector.ReflectRadians(paddleAngle);
          this.IncreaseDifficulty();
        } else { // check if ball lost
          if (ball.position.y > this.bottom + ball.size) { // ball is completely past the border, start over
            this.sprites.remove(ball);
            // if no balls remain, game over
            if (this.sprites.length == 0) {
              this.EndGame();
            }
          }
        }
      }
    } else { // travelling up, check if "hit" top wall
      if (ball.position.y < this.top + ball.size) {hitWall = true}
    }
    if (hitWall) {
      ball.vector.ReflectY();
      // randomize the direction by up to a degree in either direction
      ball.vector.RandomDegrees(2);
    }
  }
  PingPlusGame.prototype.TimeElapsed = function(){
    //TODO - this is a hacky workaround (also, see the other one)
    // It's not calling the method on the right object, it's calling it generically.
    // So this will *make* it call on the right object.
    // But this won't due, need to figure a way to call a method on an instance from a "setInterval"
    if (this === thisGame){/*continue*/}else{thisGame.TimeElapsed();return;}

    // first, update location of user mouse/cursor
    this.cursor.Move();

    for ( i = 0 ; i < this.sprites.length ; ++i ){
      var sprite = this.sprites[i]
      this.MoveSprite(sprite);
    }
    this.Draw();
  }
  PingPlusGame.prototype.ClickEvent = function(){ // best guess at user's intent
  //TODO - this is a hacky workaround (also, see the other one)
  if (this === thisGame){/*continue*/}else{thisGame.ClickEvent();return;}

    switch (this.gameState) {
     case 'running':
      this.PauseUnpauseGame();
      break;
     case 'gameover':
      this.InitializeGame();
      break;
     case 'initial':
      this.Start();
      break;
    }
  }
  PingPlusGame.prototype.Start = function(){
    this.gameState = 'running';
    this.gameMessage = null;
    this.runningInterval = setInterval(this.TimeElapsed,10);
  }
  PingPlusGame.prototype.PauseUnpauseGame = function(){
    if (this.runningInterval == null) { // not running, so resume game
      this.gameMessage = null;
      this.runningInterval = setInterval(this.TimeElapsed,10);
    } else { // pause game
      clearInterval(this.runningInterval);
      this.runningInterval = null;
      this.gameMessage = 'paused';
      this.Draw();
    }
  }
  PingPlusGame.prototype.EndGame = function(){
    this.gameState = 'gameover';
    this.gameMessage = '\nGame Over\n      Click to Reset      ';
    this.Draw();
    clearInterval(this.runningInterval);
    this.runningInterval = null;
  }
  function SetMovementToTrack(tracker,target){
      // override function "Move" to match the position of target object
      tracker.target = target;
      tracker.Move = function(moments){
        this.position.x = this.target.position.x;
        this.position.y = this.target.position.y;
      }
  }
  function SetMovementToFollow(tracker,target){
      // override function "Move" to follow the target object
      tracker.target = target;
      tracker.Move = function(moments){
        var oldSpeed = this.vector.speed;
        var v = new Vector(this.position,this.target.position);
        v.speed = oldSpeed;
        if (moments == null) {
          v = v;
        } else {
          v = v.Times(moments);
        }
        this.position.AddVector(v);
      }
  }
  PingPlusGame.prototype.InitializeOnce = function(){
    this.left = -100;
    this.top = -100;
    this.right = 100;
    this.bottom = 100;
    this.width = Math.abs(this.right - this.left);
    this.height = Math.abs(this.bottom - this.top);
    this.canvasWidth  = 400;
    this.canvasHeight = 400;

    /* dynamically setting size, and adding event handlers, just because it's kindof cool to do it this way :-) */
    // attributes that affect the display
    //TODO - maybe make this not use setAttribute ... can't seem to do the other thing, because can't get it to pass in the event
    this.frontCanvas.setAttribute('onmousemove','GetCursorPosition(event);')
    this.frontCanvas.setAttribute('onmouseout','GetCursorPosition(event);')
    // TODO - This is ok at the moment without the event, since I don't need to know what button was clicked etc, but would be nice to pass in event
    this.frontCanvas.onclick = this.ClickEvent;
    var canvasArray = [this.backCanvas,this.frontCanvas];
    for ( i = 0 ; i < canvasArray.length ; ++i ){
      var thisCanvas = canvasArray[i];
      thisCanvas.height = this.canvasHeight;
      thisCanvas.width = this.canvasWidth;
      var thisContext = thisCanvas.getContext('2d');
      thisContext.scale(this.canvasWidth / this.width, this.canvasHeight / this.height)
      thisContext.translate(-this.left,-this.top);
    }
  }
  PingPlusGame.prototype.InitializeGame = function(){
    this.gameState = 'initial';
    this.sprites = new Array();

    // add object to track the mouse position
    this.cursor = new MouseCursor(this.top,this.right,this.bottom,this.left,this.frontCanvas);

    var ballSize = 5;
    // add a white standard ball
    var whiteBall = new Ball(new Position(0, this.bottom - ballSize),
                             (new Vector(Math.PI*1.5,4)).RandomDegrees(15),
                             ballSize,'#fff');
    this.sprites.push(whiteBall);
    // add a blue ball that tracks the white ball
    var blueBall = new Ball(new Position(0, this.bottom - ballSize),
                            new Vector(0,3),
                            ballSize,'#f77');
    this.sprites.push(blueBall);
    SetMovementToFollow(blueBall,whiteBall);
    // add a green paddle, which tracks the user's cursor
    var paddleHeight = 5;
    var greenPaddle = new Paddle(new Position(this.left + this.width/2, this.bottom - paddleHeight/2)
                                ,50
                                ,paddleHeight
                                ,'#0f0');
    this.sprites.push(greenPaddle);
    this.paddle = greenPaddle;// TODO - get rid of special object "this.paddle"
    SetMovementToTrack(greenPaddle,this.cursor);

    this.difficultyLevel = 0;
    this.runningInterval = null;
    this.gameMessage = 'Click to Start';
    this.Draw();
  }

  this.InitializeOnce();
  this.InitializeGame();
}
var thisGame = new PingPlusGame();
var ctx = thisGame.frontContext
// Performance testing -- rendering on canvas:
// 1) clearRect only: 1 million / 1.3 seconds
// 2) clearRect+fillRect: 1 million clears / 2.45 seconds
// 3) clearRect+fillRect+circle: 0.1 million clears / 0.67 seconds
// 4) circle: 0.5 million clears / 20 seconds
// 5) circle: 0.75 million clears / 40 seconds
// 6) circle: 1 million clears / 59 seconds
// There appears to be a problem with drawing a large number of circles all at once, probably a memory leak?
