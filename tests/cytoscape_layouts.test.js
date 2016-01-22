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

describe("checking the layout systems in cytoscape", function(){
    
    it('just make sure something is happening', function(){

	// Micro assembly.
	var g = new graph();
	var n_a = new node('a');
	var n_b = new node('b');
	var n_c = new node('c');
	//var n_d = new node('d');
	var e1 = new edge(n_b, n_a);
	var e2 = new edge(n_c, n_a);
	g.add_node(n_b);
	g.add_node(n_c);
	//g.add_node(n_d);
	g.add_node(n_a);
	g.add_edge(e1);
	g.add_edge(e2);
	
	// Jimmy out the sugiyama core.
	var leng = new layout();
	var l = leng.render(g, 'breadthfirst');

	//console.log(l);

	// Test the limits of the layout.
	var zero_zero_count = 0;
	us.each(l.nodes, function(mnode){
	    assert.isBelow(mnode.x, 2.0, 'is below x');
	    assert.isBelow(mnode.y, 2.0, 'is below y');
	    assert.isAbove(mnode.x, -0.00001, 'is above x');
	    assert.isAbove(mnode.y, -0.00001, 'is above y');

	    if( mnode.x === 0 && mnode.y === 0 ){
		zero_zero_count += 1;
	    }
	});

	assert.isBelow(zero_zero_count, 2, 'only one node can be at 0, 0: ' +
		       zero_zero_count);
    });
});
