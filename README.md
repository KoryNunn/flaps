## Flap

## Wat.

A tiny module for creating android-like swipe-from-the-side menus.

Flap trys to do as little as possible, and instead you are encouraged to fiddle with them until they suite your needs.

## Usage

Make a flap.

    var Flap = require('./flap'),
        flap = new Flap();

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