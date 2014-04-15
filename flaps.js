var doc = require('doc-js'),
    EventEmitter = require('events').EventEmitter,
    interact = require('interact-js'),
    crel = require('crel'),
    venfix = require('venfix'),
    unitr = require('unitr'),
    laidout = require('laidout');

var LEFT = 'left';
    RIGHT = 'right';
    BOTTOM = 'bottom';
    TOP = 'top',
    CLOSED = 'closed',
    OPEN = 'open',
    CLOSE = 'close'
    HORIZONTAL = 'horizontal',
    VERTICAL = 'vertical',
    CLOSE = 'close';

function getPlane(angle){
    return ((angle > 45 && angle < 135) || (angle < -45 && angle > -135)) ? HORIZONTAL : VERTICAL;
}

function getPlaneForSide(side){
    return (side === LEFT || side === RIGHT) ? HORIZONTAL : VERTICAL;
}

function Flap(element){
    this.render(element);
    this.init();
}
Flap.prototype = Object.create(EventEmitter.prototype);

Flap.prototype.constructor = Flap;
Flap.prototype.distance = 0;
Flap.prototype.state = CLOSED;
Flap.prototype.width = 280;
Flap.prototype.side = LEFT;
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
    this.element.style.top = unitr(0);
    this.element.style.bottom = unitr(0);
    this.element.style.left = unitr(0);
    this.element.style.right = unitr(0);
    this.close();

    this.content.style[venfix('boxSizing')] = 'border-box';
    this.content.style.position = 'absolute';
    this.content.style['overflow-x'] = 'hidden';
    this.content.style['overflow-y'] = 'auto';

    if(getPlaneForSide(this.side) === HORIZONTAL){
        this.content.style.top = unitr(0);
        this.content.style.bottom = unitr(0);
        this.content.style.width = unitr(this.width);
    }else{
        this.content.style.left = unitr(0);
        this.content.style.right = unitr(0);
        this.content.style.height = unitr(this.width);
    }

    if(this.side === LEFT){
        this.content.style.left = unitr(0);
    }else if(this.side === RIGHT){
        this.content.style.left = unitr(100, '%');
    }else if(this.side === BOTTOM){
        this.content.style.top = unitr(100, '%');
    }else if(this.side === TOP){
        this.content.style.top = unitr(0);
    }
    this.hide();
    this.update();
};
Flap.prototype.disable = function(){
    this.enabled = false;

    this.element.style.position = null;
    this.element.style.top = null;
    this.element.style.bottom = null;
    this.element.style.width = null;
    this.element.style[venfix('pointerEvents')] = null;

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

    this.show();
    this.update();
};
Flap.prototype._isValidInteraction = function(interaction){
    if(this.constructor.openFlap){
        return this.constructor.openFlap === this;
    }
    if(this.distance){
        return true;
    }
    if(this.side === LEFT){
        return interaction.pageX < this.distance + this.gutter;
    }else if(this.side === RIGHT){
        return interaction.pageX > window.innerWidth - this.gutter;
    }else if(this.side === BOTTOM){
        return interaction.pageY > window.innerHeight - this.gutter;
    }else if(this.side === TOP){
        return interaction.pageY < this.distance + this.gutter;
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

    if(flap.constructor.openFlap === flap){
        var angle = interaction.getCurrentAngle(true);

        var side = flap.side;

        if(!flap.beingDragged){
            if(getPlaneForSide(side) !== getPlane(angle)){
                flap.constructor.openFlap = null;
                return;
            }
        }

        interaction.preventDefault();

        flap.beingDragged = true;
        flap.startDistance = flap.startDistance || flap.distance;
        if(flap.side === LEFT){
            flap.distance = flap.startDistance + interaction.pageX - interaction.lastStart.pageX;
        }else if(flap.side === RIGHT){
            flap.distance = flap.startDistance - interaction.pageX + interaction.lastStart.pageX;
        }else if(flap.side === BOTTOM){
            flap.distance = flap.startDistance - interaction.pageY + interaction.lastStart.pageY;
        }else if(flap.side === TOP){
            flap.distance = flap.startDistance + interaction.pageY - interaction.lastStart.pageY;
        }
        flap.distance = Math.max(Math.min(flap.distance, flap.renderedWidth()), 0);
        flap.update();
        flap.speed = flap.distance - flap.oldDistance;
        flap.oldDistance = flap.distance;
    }
};
Flap.prototype._end = function(interaction){
    if(this.constructor.openFlap !== this){
        return;
    }
    if(!this.beingDragged){
        this.settle(this.distance <= 0 ? CLOSE : OPEN);
        this._activate(interaction);
        return;
    }

    this.startDistance = null;
    this.beingDragged = false;

    var direction = CLOSE;

    if(Math.abs(this.speed) >= 3){
        direction = this.speed < 0 ? CLOSE : OPEN;
    }else if(this.distance < this.renderedWidth() / 2){
        direction = CLOSE;
    }else{
        direction = OPEN;
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
        this.settle(CLOSE);
    }
};
Flap.prototype._setOpen = function(){
    if(this.constructor.openFlap !== this){
        var flap = this;
        this.constructor.openFlap = this;
        this.show();
        this.state = OPEN;
        this.emit(OPEN);

        // This prevents the flap from screwing up
        // events on elements that may be under the swipe zone
        this._pointerEventTimeout = setTimeout(function(){
            flap.element.style[venfix('pointerEvents')] = 'all';
        },500);
    }
};
Flap.prototype.hide = function(){
    if(this.element.style.visibility !== 'hidden'){
        this.element.style.visibility = 'hidden';
    }
};
Flap.prototype.show = function(){
    if(this.element.style.visibility !== ''){
        this.element.style.visibility = '';
    }
};
Flap.prototype._setClosed = function(){
    this.constructor.openFlap = null;
    clearTimeout(this._pointerEventTimeout);
    this.element.style[venfix('pointerEvents')] = 'none';
    this.hide();
    this.state = CLOSED;
    this.emit(CLOSE);
};
Flap.prototype.update = function(interaction){
    var flap = this;

    if(this.distance > 0){
        this._setOpen();
    }

    if(this.side === LEFT || this.side === TOP){
        this.displayPosition = flap.distance - flap.renderedWidth();
    }else{
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
        if(getPlaneForSide(this.side) === HORIZONTAL){
            this.content.style[venfix('transform')] = 'translate3d(' + unitr(displayPosition) + ',0,0)';
        }else{
            this.content.style[venfix('transform')] = 'translate3d(0,' + unitr(displayPosition) + ',0)';
        }
    }
};
Flap.prototype.settle = function(direction){
    var flap = this;

    cancelAnimationFrame(this.settleFrame);

    if(this.beingDragged){
        return;
    }

    flap.distance += direction === CLOSE ? -1 : 1;

    if(this.distance <= 0){
        this.distance = 0;
        this._setClosed();
        this.update();
        this.emit('settle');
        return;
    }else if(this.distance >= this.renderedWidth()){
        this.distance = this.renderedWidth();
        this.update();
        this.emit('settle');
        return;
    }

    this.settleFrame = requestAnimationFrame(function(){
        var step = flap.tween(direction);
        flap.distance += direction === CLOSE ? -step : step;
        flap.update();
        flap.settle(direction);
    });
};
Flap.prototype.tween = function(direction){
    return direction === OPEN ?
        (this.renderedWidth() - this.distance) / 3 + 1:
        this.distance / 3 + 1;
};
Flap.prototype.percentOpen = function(){
    return parseFloat(100 / this.renderedWidth() * this.distance);
};
Flap.prototype.open = function(){
    if(!this.enabled){
        return;
    }
    this.settle(OPEN);
};
Flap.prototype.close = function(){
    if(!this.enabled){
        return;
    }
    this.settle(CLOSE);
};
var widthFrame;
Flap.prototype.calculateWidth = function(){
    if(getPlaneForSide(this.side) === HORIZONTAL){
        this._calculatedWidth = this.content.clientWidth;
    }else{
        this._calculatedWidth = this.content.clientHeight;
    }
}
Flap.prototype.renderedWidth = function(){
    var flap = this;
    cancelAnimationFrame(widthFrame);
    widthFrame = requestAnimationFrame(this.calculateWidth.bind(this));
    if(!('_calculatedWidth' in this)){
        this.calculateWidth();
    }
    return this._calculatedWidth;
};
module.exports = Flap;