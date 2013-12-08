var Flap = require('./flap'),
    doc = require('doc-js'),
    crel = require('crel');

var leftFlap = new Flap(crel('div', {'class':'wat'},
        crel('div'),
        crel('div', {'class':'mask'})
    )),
    rightFlap = new Flap();

leftFlap.mask = leftFlap.element.lastChild;


rightFlap.side = 'right';


leftFlap.on('move', function(){
    this.mask.style['-webkit-transform'] = 'translate3d(' + -(100 - this.percentOpen()) + '%,0,0)';
});

leftFlap.content.appendChild(crel('button', 'THING'));

rightFlap.on('move', function(){
    this.element.style.background = 'rgba(255,0,0,' + this.percentOpen() / 200 + ')';
});

window.onload = function(){
    leftFlap.element.classList.add('flap');
    rightFlap.element.classList.add('flap');
    document.body.appendChild(leftFlap.element);
    document.body.appendChild(rightFlap.element);
};