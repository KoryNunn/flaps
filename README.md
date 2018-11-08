## :bird: Flap 

## What

A tiny module for creating Android-like swipe-from-the-side menus.

Flap tries to do as little as possible, and instead you are encouraged to fiddle with them until they suit your needs.

## Usage

### Make a Flap

```js
var Flap = require('flaps'),
flap = new Flap();
```

### Assign a side

```js
flap.side = 'right';
```

### Assign a width

```js
flap.width = '50%';
```

### Shuv it somewhere

```js
document.body.appendChild(flap.element);
```

### Shuv something into it

```js
// If you are awesome
flap.content.appendChild(someDOMElement);

// If you are less awesome
flap.content.innerHTML = 'sadface';
```

You can optionally pass a DOM element to flaps when it is constructed and it will use it as it's DOM elements. A Flap requires at least this structure:

```js
<[element]>
    <[element]></[element]>
</[element]>
```

and...

```js
var flap = new Flap(<The above DOM structure>);
```

However, you can add whatever you want in addition to this and it should probably still work.

Flaps will raise a few events during their lifecycle.

 - `ready`: The Flap has been rendered, and all styles have been applied.
 - `close`: The Flap was just closed.
 - `open`: The Flap is now open.
 - `move`: The Flap's position just updated.
 - `settle`: The Flap just settled open or closed.

If you want control over how it tweens it's position, you can overwrite the `.tween` function on the flap:

```js
// A really exaggerated tween
flap.tween = function(direction){
    var step = (this.renderedWidth() - this.distance) / 2 + 1;
    this.distance += direction === 'close' ? -step : step;
};
```

If you want to change the Flap's style in a way other than `transform-x`, you can override the `updateStyle` function:

```js
// rotate the content instead.
flap.updateStyle = function(){
    this.content.style[venfix('transform')] = 'rotateY(' + (90 - 90 / 100 * this.percentOpen()) + 'deg)';
};
```

I will probably change the way Flaps animate in the future to be time based rather than position based.

## Caveat

Works OK, but not perfectly, in IE >= 9, Does not work in IE <= 8. Pull requests welcome.
