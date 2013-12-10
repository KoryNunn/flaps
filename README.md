## Flap

## Wat.

A tiny module for creating android-like swipe-from-the-side menus.

Flap trys to do as little as possible, and instead you are encouraged to fiddle with them until they suite your needs.

## Usage

Make a flap.

    var Flap = require('flaps'),
        flap = new Flap();

Assign a side

    flap.side = 'right';

Shuv it somewhere

    document.body.appendChild(flap.element);

Shuv something into it

    // If you are awesome
    flap.content.appendChild(someDOMElement);

    // If you are less awesome
    flap.content.innerHTML = 'sadface';

You can optionally pass a DOM element to flaps when it is constructed and it will use it as it's DOM elements. a Flap requires at least this structure:

    <[element]>
        <[element]></[element]>
    </[element]>

and...

    var flap = new Flap(<The above DOM structure>);

however you can add whatever you want in addition to this and it should probably still work.

Flaps will raise a few events during their lifecycle.

 - ready: The flap has been rendered, and all styles have been applied.
 - close: The flap was just closed.
 - open: The flap is now open.
 - move: The flap's position just updated.

If you want control over how it tweens it's position, you can overwrite the .tween function on the flap:

    // A really exaggerated tween
    flap.tween = function(direction){
        var step = (this.width - this.distance) / 2 + 1;
        this.distance += direction === 'close' ? -step : step;
    };

If you want to change the flap's style in a way other than transform-x, you can override the updateStyle function:

    // rotate the content instead.
    flap.updateStyle = function(){
        this.content.style[venfix('transform')] = 'rotateY(' + (90 - 90 / 100 * this.percentOpen()) + 'deg)';
    };

I will probably change the way flaps animate in the future to be time based rather than position based..

 ## Caveat

 Works a bit shit in firefox. Pull requests welcome.

 Does not work in IE, I have no idea why, I didn't look into it much. Pull requests welcome.