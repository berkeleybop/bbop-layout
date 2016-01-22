////
//// Some unit testing for layout.js
////

var chai = require('chai');
chai.config.includeStack = true;
var assert = chai.assert;
var layout = require('..');

// Correct environment, ready testing.
var us = require('underscore');
var bbop = require('bbop-core');
var model = require('bbop-graph');

// Aliases.
var each = us.each;
var node = model.node;
var edge = model.edge;
var graph = model.graph;

///
/// Start unit testing.
///

describe("bbop's random corner layout", function(){
    
    it('graph', function(){

	// Micro assembly.
	var g = new graph();
	var n_a = new node('a');
	var n_b = new node('b');
	var n_c = new node('c');
	var e1 = new edge(n_b, n_a);
	var e2 = new edge(n_c, n_a);
	g.add_node(n_a);
	g.add_node(n_b);
	g.add_node(n_c);
	g.add_edge(e1);
	g.add_edge(e2);
	
	// Jimmy out the sugiyama core.
	var leng = new layout();
	var l = leng.render(g, 'random-corner');

	// Test the limits of the layout--very improbable to actually
	// hit the corner.
	us.each(l.nodes, function(mnode){
	    assert.isBelow(mnode.x, 1.0, 'is below x');
	    assert.isBelow(mnode.y, 1.0, 'is below y');
	    assert.isAbove(mnode.x, 0.0, 'is above x');
	    assert.isAbove(mnode.y, 0.0, 'is above y');
	});
    });
});
