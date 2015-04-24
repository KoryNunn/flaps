var doc = require('doc-js'),
    EventEmitter = require('events').EventEmitter,
    interact = require('interact-js'),
    pythagoreanEquation = require('math-js/geometry/pythagoreanEquation'),
    crel = require('crel'),
    venfix = require('venfix'),
    unitr = require('unitr'),
    laidout = require('laidout');

var LEFT = 'left',
    RIGHT = 'right',
    BOTTOM = 'bottom',
    TOP = 'top',
    CLOSED = 'closed',
    OPEN = 'open',
    CLOSE = 'close',
    HORIZONTAL = 'horizontal',
    VERTICAL = 'vertical',
    CLOSE = 'close',
    NE = 45,
    NW = -45,
    SE = 135,
    SW = -135,
    opposites = {};

opposites[LEFT] = RIGHT;
opposites[RIGHT] = LEFT;
opposites[TOP] = BOTTOM;
opposites[BOTTOM] = TOP;

var allFlaps = [];

function getSideForAngle(angle){
    return angle > SW ?
        angle > NW ?
            angle > NE ?
                angle > SE ? BOTTOM : RIGHT :
            TOP :
        LEFT :
    BOTTOM;
}

function getPlane(angle){
    return ((angle > NE && angle < SE) || (angle < NW && angle > SW)) ? HORIZONTAL : VERTICAL;
}

function getPlaneForSide(side){
    return (side === LEFT || side === RIGHT) ? HORIZONTAL : VERTICAL;
}

function getFlapBoxInfo(flap){
    var boundingRect = flap.getBoundingRect(),
        gutter = flap.gutter,
        box = {
            left: boundingRect.left,
            marginLeft: boundingRect.left,
            top: boundingRect.top,
            marginTop: boundingRect.top,
            right: boundingRect.right,
            marginRight: boundingRect.right,
            bottom: boundingRect.bottom,
            marginBottom: boundingRect.bottom,
            width: boundingRect.width,
            marginWidth: boundingRect.width,
            height: boundingRect.height,
            marginHeight: boundingRect.height
        };

    if(flap.side === LEFT){
        box.marginWidth += gutter;
        box.marginRight += gutter;
    }else if(flap.side === RIGHT){
        box.marginWidth += gutter;
        box.marginLeft -= gutter;
    }else if(flap.side === BOTTOM){
        box.marginHeight += gutter;
        box.marginTop -= gutter;
    }else if(flap.side === TOP){
        box.marginHeight += gutter;
        box.marginBottom += gutter;
    }

    return box;
}

function bound(min, max, value){
    return Math.min(Math.max(value, min), max);
}

function getDistanceFromInteraction(interaction, flapInfo){
    var horizontalBound = bound.bind(null, window.scrollX, window.innerWidth + window.scrollX),
        verticalBound = bound.bind(null, window.scrollY, window.innerHeight + window.scrollY);

    return pythagoreanEquation(
        interaction.pageX - horizontalBound(flapInfo.box.marginLeft + flapInfo.box.marginWidth) - horizontalBound(flapInfo.box.marginWidth) / 2,
        interaction.pageY - verticalBound(flapInfo.box.marginTop + flapInfo.box.marginHeight) - verticalBound(flapInfo.box.marginHeight) / 2
    );
}

function getWorthyness(interaction, flapInfo1, flapInfo2){
    var interactionProximity = getDistanceFromInteraction(interaction, flapInfo2) - getDistanceFromInteraction(interaction, flapInfo1);

    return interactionProximity;
}

function getCandidatesForInteraction(interaction,flaps){
    return flaps.reduce(function(results, flap) {
        var box = getFlapBoxInfo(flap),
            angle = interaction.getCurrentAngle(true);

        if(
            flap.isValidInteraction(interaction) &&
            !flap.beingDragged &&
            getPlaneForSide(flap.side) === getPlane(angle) &&
            interaction.pageX - window.scrollX > box.marginLeft &&
            interaction.pageX - window.scrollX < box.marginRight &&
            interaction.pageY - window.scrollY > box.marginTop &&
            interaction.pageY - window.scrollY < box.marginBottom
        ){
            results.push({
                box: box,
                flap: flap
            });
        }


        return results;

    }, []);
}

function moveableCandidates(interaction, candidate){
    var angle = interaction.getCurrentAngle(true),
        flap = candidate.flap,
        side = flap.side,
        distance = flap.distance,
        maxPosition = flap.renderedWidth(),
        minPosition = 0;

    if(distance > minPosition && distance < maxPosition){
        return true;
    }

    var canMoveDirection = distance === minPosition ? opposites[side] : side;

    return canMoveDirection === getSideForAngle(angle);
}

function setLastInList(array, item){
    var index = array.indexOf(item);

    if(index>=0){
        array.splice(index, 1);
        array.push(item);
    }
}

function setFirstInList(array, item){
    var index = array.indexOf(item);

    if(index>=0){
        array.splice(index, 1);
        array.unshift(item);
    }
}

function forEachOpenFlap(fn){
    var i = allFlaps.length;
    while (i) {
        i--;
        var flap = allFlaps[i];
        if(flap.state === OPEN){
            fn(flap);
        }else{
            break;
        }
    }
}

function delegateInteraction(interaction){
    if(interaction._flap){
        interaction._flap._drag(interaction);
    }

    if(interaction._delegated){
        return;
    }

    interaction._delegated = true;

    var candidates = getCandidatesForInteraction(interaction, allFlaps),
        moveable = candidates.filter(moveableCandidates.bind(null, interaction));

    if(moveable.length){
        candidates = moveable;
    }

    var flapCandidate = candidates
        .sort(getWorthyness.bind(null, interaction))
        .pop();

    if(!flapCandidate){
        return;
    }

    interaction.preventDefault();

    interaction._flap = flapCandidate.flap;
    flapCandidate.flap._start(interaction);

    forEachOpenFlap(function(flap){
        if(
            flap !== flapCandidate.flap &&
            !doc(flapCandidate.flap.element).closest(flap.element)
        ){
            flap.close();
        }
    });
}

function endInteraction(interaction){
    if(interaction._flap){
        interaction._flap._end(interaction);
        interaction._flap = null;
    }else{
        forEachOpenFlap(function(flap){
            //if(doc(interaction.target).closest(flap.element)){
                flap._activate(interaction.originalEvent);
            //}
        });
    }
}

function bindEvents(){
    interact.on('drag', document, delegateInteraction);
    interact.on('end', document, endInteraction);
    interact.on('cancel', document, endInteraction);
}

if(typeof window !== 'undefined'){
    bindEvents();
}

function Flap(element){
    this.render(element);
    this.init();
    allFlaps.push(this);
}
Flap.prototype = Object.create(EventEmitter.prototype);

Flap.prototype.constructor = Flap;
Flap.prototype.distance = 0;
Flap.prototype.state = CLOSED;
Flap.prototype.width = 280;
Flap.prototype.side = LEFT;
Flap.prototype.gutter = 50;

Flap.prototype.destroy = function(){
    var index = allFlaps.indexOf(this);

    if(index >= 0){
        allFlaps.splice(index, 1);
    }
};
Flap.prototype.render = function(element){
    this.element = element || crel('div',
        crel('div')
    );
    this.element.style.opacity = '0';

    this.content = this.element.childNodes[0];
    this.element.flap = this;
};
Flap.prototype.init = function(){
    var flap = this;
    laidout(this.element, function(){
        if(flap.enabled !== false){
            flap.enable();
        }else{
            flap.disable();
        }
        flap.updateStyle();
        flap.element.style.opacity = null;
        flap.emit('ready');
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
    this.distance = 0;

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
Flap.prototype._start = function(interaction){
    if(!this.enabled){
        return;
    }

    this._interaction = interaction;
};
Flap.prototype._drag = function(interaction){
    if(!this.enabled){
        return;
    }

    var flap = this;

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

};
Flap.prototype._end = function(){
    if(!this.enabled){
        return;
    }

    this._interaction = null;

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
        !this.beingDragged &&
        !doc(event.target).closest(this.content)
    ){
        event.preventDefault();
        this.beingDragged = false;
        this.settle(CLOSE);
    }
};
Flap.prototype._setOpen = function(){
    var flap = this;
    this.show();
    this.state = OPEN;
    setLastInList(allFlaps, this);
    this.emit(OPEN);

    // This prevents the flap from screwing up
    // events on elements that may be under the swipe zone
    clearTimeout(this._pointerEventTimeout);
    this._pointerEventTimeout = setTimeout(function(){
        flap.element.style[venfix('pointerEvents')] = 'all';
    },100);
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
    clearTimeout(this._pointerEventTimeout);
    this.element.style[venfix('pointerEvents')] = 'none';
    this.hide();
    this.state = CLOSED;
    this.emit(CLOSE);
    setFirstInList(allFlaps, this);
};
Flap.prototype.update = function(){
    var flap = this;

    if(this.side === LEFT || this.side === TOP){
        this.displayPosition = flap.distance - flap.renderedWidth();
    }else{
        this.displayPosition = -flap.distance;
    }

    if(flap.distance != flap.lastDistance){
        requestAnimationFrame(function(){
            if(flap.distance > 0){
                flap._setOpen();
            }
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
    return parseFloat(100 / this.renderedWidth() * this.distance) || 0;
};
Flap.prototype.open = function(){
    if(!this.enabled || this._interaction){
        return;
    }
    this.settle(OPEN);
};
Flap.prototype.close = function(){
    if(!this.enabled || this._interaction){
        return;
    }
    this.settle(CLOSE);
};
var widthFrame,
    lastTime = 0;
Flap.prototype.renderedWidth = function(){
    var now = Date.now();

    if(widthFrame === null || now - lastTime > 16){
        lastTime = now;
        if(getPlaneForSide(this.side) === HORIZONTAL){
            return widthFrame = this.content.clientWidth;
        }else{
            return widthFrame = this.content.clientHeight;
        }
    }

    return widthFrame;
};
Flap.prototype.getBoundingRect = function() {
    var targetElement = this.distance ? this.element : this.content;

    return targetElement.getBoundingClientRect();
};
Flap.prototype.isValidInteraction = function(interaction) {
    return true;
};

module.exports = Flap;