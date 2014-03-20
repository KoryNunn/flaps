var doc = require('doc-js'),
    EventEmitter = require('events').EventEmitter,
    interact = require('interact-js'),
    crel = require('crel'),
    venfix = require('venfix'),
    laidout = require('laidout');

function Flap(element){
    this.render(element);
    this.init();
}
Flap.prototype = Object.create(EventEmitter.prototype);

Flap.prototype.constructor = Flap;
Flap.prototype.distance = 0;
Flap.prototype.state = 'closed';
Flap.prototype.width = 280;
Flap.prototype.side = 'left';
Flap.prototype.gutter = 20;

Flap.prototype.render = function(element){
    this.element = element || crel('div',
        crel('div')
    );
    this.element.style.opacity = '0';

    this.content = this.element.childNodes[0];
    this.element.flap = this;
};
Flap.prototype.bind = function(){
    var flap = this,
        delegateTarget = doc(this.delegateTarget)[0] || document;

    // Allow starting the drag on a delegate target
    interact.on('start', delegateTarget, flap._start.bind(flap));

    // Still use document for the other events for robustness.
    interact.on('drag', document, flap._drag.bind(flap));
    interact.on('end', document, flap._end.bind(flap));
    interact.on('cancel', document, flap._end.bind(flap));

    doc(this.element).on('click', flap._activate.bind(flap));
};
Flap.prototype.init = function(){
    var flap = this;
    laidout(this.element, function(){
        flap.bind();
        if(this.enabled !== false){
            flap.enable();
        }else{
            flap.disable();
        }
        flap.emit('ready');
        flap.element.style.opacity = null;
    });
};
Flap.prototype.enable = function(){
    this.enabled = true;

    this.element.style.position = 'fixed';
    this.element.style.top = '0px';
    this.element.style.bottom = '0px';
    this.element.style.width = '100%';
    this.close();

    this.content.style[venfix('boxSizing')] = 'border-box';
    this.content.style.width = this.width + 'px';
    this.content.style.position = 'absolute';
    this.content.style.top = '0px';
    this.content.style.bottom = '0px';
    this.content.style.width = this.width + 'px';
    this.content.style['overflow-x'] = 'hidden';
    this.content.style['overflow-y'] = 'auto';

    if(this.side === 'left'){
        this.element.style.left = '0px';
        this.content.style.left = '0px';
    }else if(this.side === 'right'){
        this.element.style.right = '0px';
        this.content.style.left = '100%';
    }
    this.update();
};
Flap.prototype.disable = function(){
    this.enabled = false;

    this.element.style.position = null;
    this.element.style.top = null;
    this.element.style.bottom = null;
    this.element.style.width = null;
    this.element.style[venfix('pointerEvents')] = null;
    this.element.style.display = null;

    this.content.style[venfix('boxSizing')] = null;
    this.content.style[venfix('transform')] = null;
    this.content.style.width = null;
    this.content.style.position = null;
    this.content.style.top = null;
    this.content.style.bottom = null;
    this.content.style.width = null;
    this.content.style['overflow-x'] = null;
    this.content.style['overflow-y'] = null;

    this.element.style.left = null;
    this.content.style.left = null;
    this.element.style.right = null;
    this.content.style.left = null;

    cancelAnimationFrame(this.settleFrame);

    this.update();
};
Flap.prototype._isValidInteraction = function(interaction){
    if(this.constructor.openFlap){
        return this.constructor.openFlap === this;
    }
    if(this.distance){
        return true;
    }
    if(this.side === 'left'){
        return interaction.pageX < this.distance + this.gutter;
    }else if(this.side === 'right'){
        return interaction.pageX > window.innerWidth - this.gutter;
    }
};
Flap.prototype._start = function(interaction){
    var flap = this;

    if(!this.enabled){
        return;
    }

    if(this._isValidInteraction(interaction)){
        this._setOpen();
    }
};
Flap.prototype._drag = function(interaction){
    var flap = this;

    if(this.constructor.openFlap === this){
        var angle = interaction.getCurrentAngle(true);
        if(angle && !this.beingDragged && ((angle > 45 && angle < 135) || (angle < -45 && angle > -135))){
            return;
        }

        interaction.preventDefault();

        flap.beingDragged = true;
        flap.startDistance = flap.startDistance || flap.distance;
        if(flap.side === 'left'){
            flap.distance = flap.startDistance + interaction.pageX - interaction.lastStart.pageX;
        }else{
            flap.distance = flap.startDistance - interaction.pageX + interaction.lastStart.pageX;
        }
        flap.distance = Math.max(Math.min(flap.distance, flap.width), 0);
        flap.update();
        flap.speed = flap.distance - flap.oldDistance;
        flap.oldDistance = flap.distance;
    }
};
Flap.prototype._end = function(interaction){
    if(this.constructor.openFlap !== this || !this.beingDragged){
        return;
    }

    this.startDistance = null;
    this.beingDragged = false;

    var direction = 'close';

    if(Math.abs(this.speed) >= 3){
        direction = this.speed < 0 ? 'close' : 'open';
    }else if(this.distance < this.width / 2){
        direction = 'close';
    }else{
        direction = 'open';
    }

    this.settle(direction);
};
Flap.prototype._activate = function(event){
    if(!this.enabled){
        return;
    }
    if(
        !doc(event.target).closest(this.content) &&
        this.constructor.openFlap === this
    ){
        event.preventDefault();
        this.beingDragged = false;
        this.settle('close');
    }
};
Flap.prototype._setOpen = function(){
    if(this.constructor.openFlap !== this){
        var flap = this;
        this.constructor.openFlap = this;
        this.element.style['display'] = null;
        this.state = 'open';
        this.emit('open');

        // This prevents the flap from screwing up
        // events on elements that may be under the swipe zone
        this._pointerEventTimeout = setTimeout(function(){
            flap.element.style[venfix('pointerEvents')] = 'all';
        },500);
    }
};
Flap.prototype._setClosed = function(){
    this.constructor.openFlap = null;
    clearTimeout(this._pointerEventTimeout);
    this.element.style[venfix('pointerEvents')] = 'none';
    this.element.style['display'] = 'none';
    this.state = 'closed';
    this.emit('close');
};
Flap.prototype.update = function(interaction){
    var flap = this;

    if(this.distance > 0){
        this._setOpen();
    }

    if(this.side === 'left'){
        this.displayPosition = flap.distance - flap.width;
    }else if(this.side === 'right'){
        this.displayPosition = -flap.distance;
    }

    if(flap.distance != flap.lastDistance){
        requestAnimationFrame(function(){
            flap.updateStyle(flap.displayPosition);
            flap.emit('move');
            flap.lastDistance = flap.distance;
        });
    }
};
Flap.prototype.updateStyle = function(displayPosition){
    if(this.enabled){
        this.content.style[venfix('transform')] = 'translate3d(' + (displayPosition) + 'px,0,0)';
    }
};
Flap.prototype.settle = function(direction){
    var flap = this;

    cancelAnimationFrame(this.settleFrame);

    if(this.beingDragged){
        return;
    }

    if(this.distance < 0){
        this.distance = 0;
        this._setClosed();
        this.update();
        this.emit('settle');
        return;
    }else if(this.distance > this.width){
        this.distance = this.width;
        this.update();
        this.emit('settle');
        return;
    }

    this.settleFrame = requestAnimationFrame(function(){
        var step = flap.tween(direction);
        flap.distance += direction === 'close' ? -step : step;
        flap.update();
        flap.settle(direction);
    });
};
Flap.prototype.tween = function(direction){
    return direction === 'open' ?
        (this.width - this.distance) / 3 + 1:
        this.distance / 3 + 1;
};
Flap.prototype.percentOpen = function(){
    return parseInt(100 / this.width * this.distance);
};
Flap.prototype.open = function(){
    if(!this.enabled){
        return;
    }
    this.settle('open');
};
Flap.prototype.close = function(){
    if(!this.enabled){
        return;
    }
    this.settle('close');
};
module.exports = Flap;