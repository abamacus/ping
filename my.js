/* Joel Elliott, November 2013 */
function $(id){return document.getElementById(id)}

Array.prototype.remove = function(elem){
  for (var i = 0 ; i < this.length ; ++i ){
    if (this[i] === elem) {
      this.splice(i,1);
    }
  }
}

function Position(x,y) {
  this.AddXY = function(x,y){
    this.x += x;
    this.y += y;
  }
  this.AddPosition = function(p){
    this.x += p.x;
    this.y += p.y;
  }
  this.AddVector = function(v){
    this.x += v.speed * Math.cos(v.radians);
    this.y += v.speed * Math.sin(v.radians);
  }
  Position.prototype.toString = function(precision){
    if (precision == null) {precision = 4};
    return '{x:' + this.x.toPrecision(precision) + ', y:' + this.y.toPrecision(precision) + '}';
  }
  Position.prototype.distance = function(pos1,pos2){
    if (this != null && pos1 instanceof Position && pos2 == null) {
      pos2 = pos1;
      pos1 = this;
    }
    // return the distance between the two positions
    var dx = pos2.x - pos1.x;
    var dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  // constructor
  Position.prototype.pointInsidePoints = function(p1, points){ // note: this method only works for fairly "simple" polygons, not "star" shapes etc
    var sumAngles = 0;
    for (var i = 0 ; i < points.length ; ++i ){
      var q1 = (i==0) ? points[points.length-1] : points[i-1];
      var q2 = points[i];
      // get angle between q1,p1,q2
      var q1Vector = new Vector(p1,q1);
      var q2Vector = new Vector(p1,q2);
      if (q1Vector.speed == 0 || q2Vector.speed == 0) {
        // point p1 is on top of one of these points ("speed" here is the distance between points)
        return false;
      }
      var thisAngle = Vector.prototype.FixRadians(q1Vector.radians - q2Vector.radians);
      if (thisAngle >= Math.PI*0.99999 && thisAngle <= Math.PI*1.00001) {
        // point is "touching" this side
        return false;
      }
      if (thisAngle > Math.PI) {
        thisAngle = Math.PI * 2 - thisAngle;
      }
      sumAngles += thisAngle;
    }
    if (sumAngles >= Math.PI*2*0.9999 && sumAngles <= Math.PI*2*1.0001) {
      return true;
    } else {
      return false;
    }
  }
  Position.prototype.getType = function(){return 'Position';}
  this.x = x;
  this.y = y;
  return this;
}
/* some code for testing:
var r1 = new Rational(123,6);
console.log(r1);
console.log(r1.toString());

var v1 = new Vector(Math.PI * 1.45,1);
var angle = Math.PI * 1.08;

var thisCanvas = document.getElementsByTagName('canvas')[0];
var ctx = thisCanvas.getContext('2d');
ctx.scale(thisCanvas.width/200, thisCanvas.height/200)
ctx.translate(100,100);
ctx.clearRect(-100,-100,200,200);
drawVector(ctx,v1,'#f00');
v1.ReflectRadians(angle);
drawVector(ctx,new Vector(angle,1),'#0f0');
drawVector(ctx,new Vector(angle+Math.PI,1),'#0f0');
drawVector(ctx,v1,'#00f');
function drawVector(ctx,v,color){
    ctx.strokeStyle=color;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(v.radians)*100,Math.sin(v.radians)*100);
    ctx.closePath();
    ctx.stroke();
  }

var p1 = new Position(0,0);
var p2 = new Position(1,-1);
var v1 = new Vector(p1,p2);
console.log(v1.toString());
*/

function Rational(numerator,denominator) {
  Rational.prototype.getType = function(){return 'Rational';}
  Rational.prototype.toString = function(){return ((this.negative)?'-':'') + this.numerator + '/' + this.denominator;}

  //constructor
  if (typeof(numerator) == 'number') {
    if (numerator != numerator.toFixed(0)){
      throw new Error('Invalid input for Rational - number inputs must not be decimal values')
    }
  } else if (numerator instanceof Rational) {
    //already validated
  } else {
    throw new Error('Invalid input for Rational - requires two inputs of (numerator,denominator), which must be type number or Rational')
  }
  if (typeof(denominator) == 'number') {
    if (denominator != denominator.toFixed(0)){
      throw new Error('Invalid input for Rational - number inputs must not be decimal values')
    }
  } else if (denominator instanceof Rational) {
    //already validated
  } else {
    throw new Error('Invalid input for Rational - requires two inputs of (numerator,denominator), which must be type number or Rational')
  }

  if (typeof(numerator) == 'number' && typeof(denominator) == 'number') {
    this.numerator = numerator;
    this.denominator = denominator;
  } else if (typeof(numerator) == 'number' && denominator instanceof Rational) {
    this.numerator = numerator * denominator.denominator;
    this.denominator = denominator.numerator;
  } else if (numerator instanceof Rational && typeof(denominator) == 'number') {
    this.numerator = numerator.numerator;
    this.denominator = numerator.denominator * denominator;
  } else if (numerator instanceof Rational && denominator instanceof Rational) {
    this.numerator = numerator.numerator * denominator.denominator;
    this.denominator = numerator.denominator * denominator.numerator;
  } else {
    throw new Error('Logic error - unhandled condition')
  }

  if (numerator/denominator < 0) {
    this.negative = true;
  }else{
    this.negative = false;
  }
  //try reducing fraction
  var i = 2;
  while(i < this.denominator && i < this.numerator){
    var n = this.numerator   / i;
    var d = this.denominator / i;
    if (n == Math.round(n) && d == Math.round(d)) {
      this.numerator   = n;
      this.denominator = d;
    } else {
      ++i;
    }
  }
  return this;
}
function Vector(parm1,parm2,parm3) {
  Vector.prototype.getType = function(){return 'Vector';}
  Vector.prototype.FixRadians = function(radians){
    while(radians < 0){ radians += Math.PI*2; }
    while(radians >= Math.PI*2){ radians -= Math.PI*2; }
    return radians;
  }
  Vector.prototype.ReflectX = function(){
    this.radians = Math.PI - this.radians;
    this.radians = this.FixRadians(this.radians);
  }
  Vector.prototype.ReflectY = function(){
    this.radians = -this.radians;
    this.radians = this.FixRadians(this.radians);
  }
  Vector.prototype.ReflectRadians = function(radians){ // change the direction as mirroring ("bouncing off of") the given vector
    radians = radians + Math.PI/2;
    radians = this.FixRadians(radians) % Math.PI;
    this.radians = this.FixRadians(Math.PI - this.radians + 2 * radians);
  }
  Vector.prototype.refrectSomethingOrOther = function(radians){
  // this is *some* kind of "reflection" -- it reflects off of the perpendicular of the intended angle
    radians = this.FixRadians(radians) % Math.PI;
    this.radians = this.FixRadians(Math.PI - this.radians + 2 * radians);
  }
  Vector.prototype.Up = function(){
    return (this.radians > Math.PI);
  }
  Vector.prototype.Down = function(){
    return !(this.Up());
  }
  Vector.prototype.Left = function(){
    return (this.radians > Math.PI/2 && this.radians < Math.PI*3/2);
  }
  Vector.prototype.Right = function(){
    return !(this.Left());
  }
  Vector.prototype.RandomRadians = function(r){
    r = this.FixRadians(Math.abs(r));
    this.radians += (Math.random()-0.5)*r;
    return this;
  }
  Vector.prototype.RandomDegrees = function(d){
    return this.RandomRadians(d*Math.PI/180);
  }
  Vector.prototype.Times = function(factor){
    return new Vector(this.radians, this.speed*factor);
  }
  Vector.prototype.Add = function(vector2){
    return new Vector(this, vector2);
  }
  Vector.prototype.toString = function(){
    var printRadians;
    // if value is at least *very* close to some fraction of PI, represent it as such, otherwise as a regular decimal number
    var precisionCheck = (Math.abs(this.radians) * 720) % Math.PI;
    if (precisionCheck < 0.0001 || precisionCheck > Math.PI - 0.0001) {
      printRadians = '(' + (this.radians / Math.PI) + ')\u03C0';
    } else {
      printRadians = this.radians;
    }
    return '{radians: ' + printRadians + ', speed: ' + this.speed + '}';
  }

  //constructor
  if (typeof(parm1) == 'number' && typeof(parm2) == 'number') {
    // input is angle (radians) and speed
    this.radians = parm1;
    this.speed = parm2;
  } else if (parm1 instanceof Vector && parm2 instanceof Vector) {
    // input is two vectors
    // TODO - add the two vectors together
    throw new Error('Addition of vectors not yet implemented')
  } else if (parm1 instanceof Position && parm2 instanceof Position) {
    // input is two positions, set vector to be the angle between them, and the speed to be the distance between them
    var dx = parm2.x - parm1.x;
    var dy = parm2.y - parm1.y;
    this.speed = Math.sqrt(dx * dx + dy * dy);
    var tempAngle;
    if (dx == 0) {tempAngle = Math.PI/2;} else {tempAngle = Math.atan(dy/dx);}
    /* Math.atan returns a value from -PI/2 to PI/2. So:
       - if the value is in a negative X quadrant, need to flip 180.
       - if value is still negative, add 2pi to make it positive.
    */
    if (dx < 0) {tempAngle += Math.PI;}
    if (tempAngle < 0) {tempAngle += Math.PI*2;}
    this.radians = tempAngle;
  } else {
    throw new Error('Input values for new Vector must be either (radians,speed) or (vector1,vector2) or (position1,position2)')
  }
  if (this.speed < 0) { // normalize - speed should be a positive number, just flip the direction 180
    this.speed *= -1;
    this.radians += Math.PI;
  }
  return this;
}
