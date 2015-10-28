// NEXT: collision is partly working, not picking up collision with walls yet
/* Joel Elliott, November 2013 */
/* Ideas for collision detection:
    all objects have position (center of object)
    all objects have function "maxRadius", the farthest distance from their center "position" that any point in the object is located.
    all objects have function "allPoints", returns an array of points that effectively define the boundaries of the object as a polygon.
      for this purpose, a circle/ball is just a many-sided polygon? or define an alternative method, like special case empty set for circles?
      note: order of array must be in-order as points going around from center of object
  collision detection process:
    let "this" be the object that is moving
     if speed=0, skip collision detection
    for each "that" as all other objects
    let dist = distance between that.position and this.position
    if dist < this.maxRadius+that.maxRadius, possible collision
      for each p1 in this, check if is inside of that:
        for each q1 and q2 in that, get the angle between q1,p1,q2
         if any points overlap, or any such angle is 180, point is "touching" that;
         not necessarily a collision, but no further calculation is needed for p1
        total all of these angles
        if total is 360 (or within some acceptable tolerance like 0.0001?) then this is a collision
        else not a collision
    important optimization (will only work if no "spin" on either object):
      for "this" object, using this.position & that.position & both vectors,
       determine at what point in time objects will be in collision range (may be in the past)
       save that time in both "this" and "that", and do not evaluate distance etc until time occurs
      whenever this object's vector changes, recalculate all collision times (in both "this" and "that")
       probably just set to null and lazy-perform the calculation, still updating both objects
  complex objects would require:
    a complex object would be one where one object controls the position and movement, and the remainder just follow it around in relative position
    thus all its parts are objects available for collision detection by other objects
    significant complexity would be in any attempt to apply momentum/deflection to a complex object
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
    cheat?     - to cheat, for all of these just do values as if objects were both balls/discs
*/

function Sprites(canvas) {

  function MouseCursor(topBound,rightBound,bottomBound,leftBound,size,color) {
    this.topBound    = topBound;
    this.rightBound  = rightBound;
    this.bottomBound = bottomBound;
    this.leftBound   = leftBound;
    this.height      = topBound - bottomBound;
    this.width       = rightBound - leftBound;
    this.size  = (size  == null) ? this.width/10 : size;
    this.color = (color == null) ? 'rgba(255,255,255,0.25)' : color;
    // default the starting point to the center, it will changes as soon as a mouse event happens
    this.position = new Position((leftBound+rightBound)/2,(topBound+bottomBound)/2);
    MouseCursor.prototype.Move = function(x,y){
      // does nothing, position is updated in UpdateCursorPosition() whenever mouse is moved
    }
    MouseCursor.prototype.Draw = function(ctx){
      /* draw cross-hair at cursor position */
      ctx.beginPath();
      ctx.moveTo(this.position.x - this.size/2,this.position.y);
      ctx.lineTo(this.position.x + this.size/2,this.position.y);
      ctx.closePath();
      ctx.strokeStyle = this.color;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.position.x,this.position.y - this.size/2);
      ctx.lineTo(this.position.x,this.position.y + this.size/2);
      ctx.closePath();
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }
    MouseCursor.prototype.toString = function(){return 'MouseCursor{position: ' + this.position.toString() + ', size: ' + this.size + ', color: ' + this.color + '}';}
    MouseCursor.prototype.onmousemove = function(event){
      this.UpdateCursorPosition(event);
    }
    MouseCursor.prototype.onmouseout = function(event){
      this.UpdateCursorPosition(event);
    }
    MouseCursor.prototype.onclick = function(event){
      console.log(this.toString());
    }
    MouseCursor.prototype.UpdateCursorPosition = function(event){
      /* This event is intended only for a mouse event on a canvas element. */
      var canvas = event.target;
      if (canvas.borderSet == null) { // to save a few cycles, only compute the border size once
        // we will assume that the padding+border+margin is equal around the object, partly because I don't know how to tell if it's not
        canvas.borderWidth  = (canvas.offsetWidth  - canvas.width )/2;
        canvas.borderHeight = (canvas.offsetHeight - canvas.height)/2;
    	canvas.borderSet = true;
      }
      /* get pixel location, relative to top-left corner of canvas */
      var pixelX = event.layerX - canvas.borderWidth; // - canvas.offsetLeft ??
      var pixelY = event.layerY - canvas.borderHeight; // - canvas.offsetTop ??
      /* adjust relative to the size of the canvas, and to the boundaries of the "world" */
      this.position.x = this.leftBound   + pixelX / canvas.width  * (this.width );
      /* NOTE: pixelY is from the top, translating here to be "math" directional */
      this.position.y = this.topBound    - pixelY / canvas.height * (this.height) ;
      /* if cursor is out of bounds, set value to min/max instead */
      if (this.position.x < this.leftBound) { this.position.x = this.leftBound; }
      else if (this.position.x > this.rightBound) { this.position.x = this.rightBound; }
      if (this.position.y < this.bottomBound) { this.position.y = this.bottomBound; }
      else if (this.position.y > this.topBound) { this.position.y = this.topBound; }
    }
  }

  function Sprite(position,vector,points,color) {
    this.type = 'Sprite';
    this.position = (position == null) ? new Position(0,0) : position;
    this.vector = (vector == null) ? new Vector(0,0) : vector;
    this.points = points;
    this.color = (color == null) ? 'rgba(255,255,255,1)' : color;
    Sprite.prototype.Move = function(moments){
      var v;
      if (moments == null) {
        v = this.vector;
      } else {
        v = this.vector.Times(moments);
      }
      this.position.AddVector(v);
    }
    Sprite.prototype.Draw = function(ctx){
      ctx.beginPath();
      var pos = this.points[0];
      ctx.moveTo(this.position.x + pos.x, this.position.y + pos.y);
      for (var i = 1 ; i < this.points.length ; ++i ){
        pos = this.points[i];
        ctx.lineTo(this.position.x + pos.x, this.position.y + pos.y);
      }
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    Sprite.prototype.updateMaxRadius = function(){
      this.maxRadius = 0;
      for ( var i = 0 ; i < this.points.length ; ++i ){
        var thisRadius = Position.prototype.distance(this.points[i],new Position(0,0));
        if (thisRadius > this.maxRadius) {
          this.maxRadius = thisRadius;
        }
      }
    }
    this.updateMaxRadius()
    Sprite.prototype.toString = function(){
      return this.type + '{position: ' + this.position.toString() +
                        ', vector: ' + this.vector.toString() +
                        ', number of points: ' + this.points.length +
                        ', color: ' + this.color +
                         '}';
    }
  }
  function newBall(position,vector,size,color) {
    if (size == null) {size = 1;}
    // represent ball as an octogon, which is a close enough shape
    var points = new Array(new Position(0,size)
                          ,new Position(size/1.414,size/1.414)
                          ,new Position(size,0)
                          ,new Position(size/1.414,-size/1.414)
                          ,new Position(0,-size)
                          ,new Position(-size/1.414,-size/1.414)
                          ,new Position(-size,0)
                          ,new Position(-size/1.414,size/1.414));
    var obj = new Sprite(position,vector,points,color);
    obj.type = 'Ball';
    obj.size = size;
    // draw ball as filled-in circle (instead of the octagon)
    function drawBall(ctx){
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI*2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    obj.Draw = drawBall;
    return obj;
  }
  function newTriangle(position,vector,size,color) {
    if (size == null) {size = 1;}
    // these points are a horrible triangle, which will be totally changed when object moves
    var points = new Array(new Position(0,size)
                          ,new Position(size,0)
                          ,new Position(-size,0));
    var obj = new Sprite(position,vector,points,color);
    obj.type = 'Triangle';
    obj.size = size;
    return obj;
  }
  function newPaddle(position,width,height,color) {
    if (width    == null) { width = 25;}
    if (height   == null) { height = 25;}
    var points = new Array(new Position(width/2,height/2)
                          ,new Position(-width/2,height/2)
                          ,new Position(-width/2,-height/2)
                          ,new Position(width/2,-height/2));
    var vector = new Vector(0,0);
    var obj = new Sprite(position,vector,points,color);
    obj.type = 'Paddle';
    obj.Move = null; /* the paddle has no default movement (normally it tracks the cursor) */
    return obj;
  }
  function newWall(position,width,height,color) {
    if (width  == null) { width  = 25;}
    if (height == null) { height = 25;}
    var points = new Array(new Position( width/2, height/2)
                          ,new Position(-width/2, height/2)
                          ,new Position(-width/2,-height/2)
                          ,new Position( width/2,-height/2));
    var vector = new Vector(0,0);
    var obj = new Sprite(position,vector,points,color);
    obj.type = 'Wall';
    obj.Move = null; /* the paddle has no default movement, it just sits there */
    return obj;
  }

  Sprites.prototype.Draw = function(){
    this.spriteContext.clearRect(this.left,this.bottom,this.width,this.height);
    for (var i = 0 ; i < this.sprites.length ; ++i ){
      var sprite = this.sprites[i]
      if (typeof(sprite.Draw) == 'function'){
        sprite.Draw(this.spriteContext);
      }
    }
  }
  Sprites.prototype.CheckCollision = function(o1,o2){
    // check if objects collided
    // return true if collision occurred, else false.
    // TODO: if collided, move first object "backwards" into a non-overlapping position of contact
    //   this will improve the reflection calculations performed after a collistion

    var dist = Position.prototype.distance(o1.position,o2.position);
    if (dist > o1.maxRadius + o2.maxRadius) {
      // objects are too far apart to possibly collide, skip further checking
      return false;
    }

    // check if any point of o1 is inside of o2
    for (var i = 0 ; i < o1.points.length ; ++i ){
      var p1 = o1.points[i];
      if (Position.prototype.pointInsidePoints(p1,o2.points)) {
        return true;
      }
    }
    // or if any point of o2 is inside of o1
    for (var i = 0 ; i < o2.points.length ; ++i ){
      var p2 = o2.points[i];
      if (Position.prototype.pointInsidePoints(p2,o1.points)) {
        return true;
      }
    }
    return false;
  }
  Sprites.prototype.TimeElapsed = function(){
    for (var i = 0 ; i < this.sprites.length ; ++i ){
      var sprite = this.sprites[i]
      if (typeof(sprite.Move) == 'function'){
        sprite.Move();
        // after moving, check if collided with any object, reacting accordingly
        for ( var j = 0 ; j < this.sprites.length ; ++j ){
          var thatSprite = this.sprites[j]
          if (thatSprite !== sprite) {
            var collision = this.CheckCollision(sprite,thatSprite);
          }
        }
      }
    }
    this.Draw();
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
        if (moments == null) {moments=1;}
        /* change the vector to point straight towards the target object */
        var tempVector = new Vector(this.position,this.target.position);
        var distance = tempVector.speed; /* save distance for use below */
        tempVector.speed = this.vector.speed;
        this.vector = tempVector;

        var momentsVector = this.vector.Times(moments);
        if (momentsVector.speed > distance) {momentsVector.speed = distance};
        this.position.AddVector(momentsVector);
        if (this.position.x < 1000){} else {clearInterval(runningInterval);} //TODO - temporary code for debugging
      }
  }
  function SetMovementToFollowSlowTurn(tracker,target,turningSpeed){
      // override function "Move" to follow the target object
      tracker.target = target;
      if (turningSpeed != null){
        tracker.turningSpeed = Math.abs(turningSpeed);
      } else if (tracker.turningSpeed == null){
        tracker.turningSpeed = Math.PI / 10;
      }
      tracker.Move = function(moments){
	    if (moments == null) {moments=1;}
        /* change the vector to point straight towards the target object */
        var tempVector = new Vector(this.position,this.target.position);
        var distance = tempVector.speed; /* save distance for use below */

        /* get "radiansDifference" as the value between direction where going, and direction where target is.
           Value is between -PI and +PI */
        var radiansDifference = tempVector.radians - this.vector.radians;
        if (radiansDifference > Math.PI){
          radiansDifference -= Math.PI * 2;
        } else if (radiansDifference < -Math.PI){
          radiansDifference += Math.PI * 2;
        }
        var radiansChange;
        if (Math.abs(radiansDifference) >= this.turningSpeed){
          // turn only the amount of the turning speed, in the direction of the target
          if (radiansDifference >= 0){
            radiansChange = this.turningSpeed;
          } else {
            radiansChange = -this.turningSpeed;
          }
        } else {
          // don't turn "past" the target either
          radiansChange = radiansDifference;
        }
        this.vector.radians += radiansChange;

        var momentsVector = this.vector.Times(moments);
        if (momentsVector.speed > distance) {momentsVector.speed = distance};
        this.position.AddVector(momentsVector);

      }
  }
  Sprites.prototype.ApplyCanvas = function(canvas){
    this.spriteCanvas  = canvas;
    this.spriteContext = canvas.getContext('2d');
    /* set size; reversing Y +/- to the standard "math" direction (default +Y here is "down") */
    this.spriteContext.scale(canvas.width / this.width, -canvas.height / this.height)
    this.spriteContext.translate(-this.left,-this.top);
    /* add event handlers */
    canvas.canvasSprite = this;
    canvas.onmousemove = function(){return this.canvasSprite.cursor.onmousemove(event)};
    canvas.onmouseout  = function(){return this.canvasSprite.cursor.onmouseout(event)};
    canvas.onclick     = function(){return this.canvasSprite.cursor.onclick(event)};
  }
  Sprites.prototype.SetInitialSprites = function(){
    this.sprites = new Array();

    // add object to track the mouse position
    this.cursor = new MouseCursor(this.top,this.right,this.bottom,this.left,this.spriteCanvas);
    //adding the cursor to the sprites would cause it to be drawn as a cross-hair
    // this.sprites.push(this.cursor);

    // add a green paddle, which tracks the user's cursor
    var paddleHeight = 5;
    var greenPaddle = newPaddle(null,50,paddleHeight,'#0f0');
    SetMovementToTrack(greenPaddle,this.cursor);
    this.sprites.push(greenPaddle);

    var ballSize = 10;
    // add a white standard ball
    var whiteBall = newBall(new Position(0, this.bottom + ballSize),
                            (new Vector(Math.PI*0.25,1)).RandomDegrees(15),
                            ballSize,'#fff');
    this.sprites.push(whiteBall);
    SetMovementToFollowSlowTurn(whiteBall,this.cursor);
    // add a blue ball that tracks the white ball
    //var blueTriangle = newTriangle(new Position(0, this.bottom + ballSize),
    //                        new Vector(0,3),
    //                        ballSize,'#00f');
    //this.sprites.push(blueTriangle);
    //SetMovementToFollow(blueTriangle,whiteBall);
    // add a teal ball that tracks the blue ball
    //var tealBall = newBall(new Position(0, this.bottom + ballSize),
    //                       new Vector(0,2),
    //                       ballSize,'#077');
    //this.sprites.push(tealBall);
    //SetMovementToFollowSlowTurn(tealBall,this.cursor);

    var wallSize = 5;
    var wallColor = '#000';
    var leftWall = newWall(new Position(this.left + wallSize/2, 0),wallSize,this.height,wallColor);
    this.sprites.push(leftWall);
    var topWall = newWall(new Position(0, this.top - wallSize/2),this.width,wallSize,wallColor);
    this.sprites.push(topWall);
    var rightWall = newWall(new Position(this.right - wallSize/2, 0),wallSize,this.height,wallColor);
    this.sprites.push(rightWall);
    var bottomWall = newWall(new Position(0, this.bottom + wallSize/2),this.width,wallSize,wallColor);
    this.sprites.push(bottomWall);
  }
  this.SetDimensions = function(){
    this.top    = 100;
    this.right  = 100;
    this.bottom = -100;
    this.left   = -100;
    this.width  = Math.abs(this.right - this.left);
    this.height = Math.abs(this.bottom - this.top);
  }
  this.SetDimensions();
  this.SetInitialSprites();
  this.ApplyCanvas(canvas);
  this.Draw();
}
