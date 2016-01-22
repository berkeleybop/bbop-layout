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

describe("bbop's sugiyama", function(){
    
    it('first graph', function(){

	// Create graph as described:
	//
	//	    	 a-\
	//	       	/ \ \
	//	       /| |\ \
	//            b c d e \
	//           /| |\| |\ \
	//          / | ||| | \ \
	//         f  g h|i j  k |
	//              \|     |/
	//               l     m
	//
	var n_a = new node('a');
	var n_b = new node('b');
	var n_c = new node('c');
	var n_d = new node('d');
	var n_e = new node('e');
	var n_f = new node('f');
	var n_g = new node('g');
	var n_h = new node('h');
	var n_i = new node('i');
	var n_j = new node('j');
	var n_k = new node('k');
	var n_l = new node('l');
	var n_m = new node('m');
	var e1 = new edge(n_b, n_a);
	var e2 = new edge(n_c, n_a);
	var e3 = new edge(n_d, n_a);
	var e4 = new edge(n_e, n_a);
	var e5 = new edge(n_f, n_b);
	var e6 = new edge(n_g, n_b);
	var e7 = new edge(n_h, n_c);
	var e8 = new edge(n_i, n_d);
	var e9 = new edge(n_j, n_e);
	var e10 = new edge(n_k, n_e);
	var e11 = new edge(n_l, n_h);
	var e12 = new edge(n_l, n_c);
	var e13 = new edge(n_m, n_k);
	var e14 = new edge(n_m, n_a);
	
	var g = new graph();
	
	// "Randomize" order and add to the graph.
	var nodes = [n_h, n_b, n_e, n_k, n_f, n_l, n_g,
		     n_c, n_d, n_i, n_j, n_m, n_a];
	var edges = [e10, e4, e14, e9, e11, e6, e2, e3,
		     e5, e7, e13, e12, e8, e1];
	each(nodes, function(node){
	    g.add_node(node);
	});
	each(edges, function(edge){
	    g.add_edge(edge);
	});
	
	// g.add_node(n_a);
	// g.add_node(n_b);
	// g.add_node(n_c);
	// g.add_node(n_d);
	// g.add_node(n_e);
	// g.add_node(n_f);
	// g.add_node(n_g);
	// g.add_node(n_h);
	// g.add_node(n_i);
	// g.add_node(n_j);
	// g.add_node(n_k);
	// g.add_edge(e1);
	// g.add_edge(e2);
	// g.add_edge(e3);
	// g.add_edge(e4);
	// g.add_edge(e5);
	// g.add_edge(e6);
	// g.add_edge(e7);
	// g.add_edge(e8);
	// g.add_edge(e9);
	// g.add_edge(e10);
	
	// Graph props.
	assert.equal(6, g.get_leaf_nodes().length, 'graph leaves');
	assert.equal(1, g.get_root_nodes().length, 'root node');
	assert.equal('a', g.get_root_nodes()[0].id(), 'tree root');
	assert.equal(1, g.get_parent_nodes('b').length, '1 b parent');
	assert.equal('a', g.get_parent_nodes('b')[0].id(),'b under a');
	assert.equal(5, g.get_child_nodes('a').length, 'a has 4');
	assert.equal(2, g.get_child_nodes('b').length, 'b has 2');
	assert.equal(0, g.get_child_nodes('f').length, 'f has 0');

	// Jimmy out the sugiyama core for testing.
	var leng = new layout();
	var sugiyama = leng.sugiyama;

	// Correct partitioning?
	var p = new sugiyama.partitioner(g);
	assert.equal(4, p.number_of_vertex_partitions(), 'node parts');
	assert.equal(3, p.number_of_edge_partitions(), 'edge parts');
	assert.equal(8, p.max_partition_width(), 'max part');
	
	// TODO: Once we decide what a layout format looks like. Keeping
	// this on because the full layout used to crash and I want to
	// catch it.
	var l = leng.render(g, 'bbop-sugiyama');
	//console.log(l);
	
    });
    
    it('loops should not destroy layout system', function(){

	// Create graph as described:
	var n_a = new node('a');
	var n_b = new node('b');
	var n_c = new node('c');
	var e_ab = new edge(n_b, n_a);
	var e_ac = new edge(n_c, n_a);
	var e_cb = new edge(n_b, n_c);
	var e_bc = new edge(n_c, n_b);
	
	var g = new graph();
	
	//
	var nodes = [n_a, n_b, n_c];
	var edges = [e_ab, e_ac, e_bc, e_cb];
	each(nodes, function(node){
	    g.add_node(node);
	});
	
	each(edges, function(edge){
	    g.add_edge(edge);
	});
	
	// Jimmy out the sugiyama core for testing.
	var leng = new layout();
	var sugiyama = leng.sugiyama;

	// Correct partitioning?
	var p = new sugiyama.partitioner(g);
	assert.equal(3, p.number_of_vertex_partitions(), 'node parts (s)');
	assert.equal(2, p.number_of_edge_partitions(), 'edge parts (s)');
	assert.equal(2, p.max_partition_width(), 'max part (s)');
	
	// TODO: Once we decide what a layout format looks like. Keeping
	// this on because the full layout used to crash and I want to
	// catch it.
	var l = leng.render(g, 'bbop-sugiyama');
	//console.log(l);
    });


    it('and for a final magic trick, a rootless loop graph', function(){
	
	// Create graph as described:
	var n_a = new node('a');
	var n_b = new node('b');
	var e_ab = new edge(n_b, n_a);
	var e_ba = new edge(n_a, n_b);
	
	var g = new graph();
	
	//
	var nodes = [n_a, n_b];
	var edges = [e_ab, e_ba];
	each(nodes, function(node){
	    g.add_node(node);
	});
	
	each(edges, function(edge){
	    g.add_edge(edge);
	});
	
	// Jimmy out the sugiyama core for testing.
	var leng = new layout();
	var sugiyama = leng.sugiyama;

	// Correct partitioning?
	var p = new sugiyama.partitioner(g);
	assert.equal(2, p.number_of_vertex_partitions(), 'node parts (m)');
	assert.equal(1, p.number_of_edge_partitions(), 'edge parts (m)');
	assert.equal(1, p.max_partition_width(), 'max part (m)');
	
	// TODO: Once we decide what a layout format looks like. Keeping
	// this on because the full layout used to crash and I want to
	// catch it.
	var l = leng.render(g, 'bbop-sugiyama');
	//console.log(l);
    });

    // https://github.com/kltm/bbop-js/issues/23
    it('this is checking the periodic layout bug', function(){
	
	//  a  b
	//  |  |
	//  c  |
	//   \ /
	//    d
	var bad = {
	    "nodes":
	    [
		{"id": "d"},
		{"id": "b"},
		{"id": "a"},
		{"id": "c"}
	    ],
	    "edges":
	    [
		{"sub": "d",
		 "obj": "c"},
		{"sub": "c",
		 "obj": "a"},
		{"sub": "d",
		 "obj": "b"}
	    ]
	};
	
	var g = new graph();
	g.load_base_json(bad);
	
	// Jimmy out the sugiyama core for testing.
	var leng = new layout();
	var sugiyama = leng.sugiyama;
	
	// Correct partitioning?
	var p = new sugiyama.partitioner(g);
	assert.equal(3, p.number_of_vertex_partitions(),
		     'node parts are should be three! (bad 1)');
	assert.equal(2, p.number_of_edge_partitions(),
      		     'edge parts should be two! (bad 1)');
	assert.equal(2, p.max_partition_width(),
		     'max part (bad 1)');
	
	// TODO: Once we decide what a layout format looks like. Keeping
	// this on because the full layout used to crash and I want to
	// catch it.
	var l = leng.render(g, 'bbop-sugiyama');
	//console.log(l);
	
    });

    it('another case derived from the above', function(){

	//  a  b
	//  |  |
	//  c  |
	//  | /
	//  d
	//  |
	//  e
	var bad = {
	    "nodes": [
		{"id": "d"},
		{"id": "e"},
		{"id": "b"},
		{"id": "a"},
		{"id": "c"}
	    ],
	    "edges": [
		{"sub": "d",
		 "obj": "c"},
		{"sub": "c",
		 "obj": "a"},
		{"sub": "e",
		 "obj": "d"},
		{"sub": "d",
		 "obj": "b"}
	    ]
	};
	
	var g = new graph();
	g.load_base_json(bad);
	
	// Jimmy out the sugiyama core for testing.
	var leng = new layout();
	var sugiyama = leng.sugiyama;
	
	// Correct partitioning?
	var p = new sugiyama.partitioner(g);
	assert.equal(4, p.number_of_vertex_partitions(),
		     'node parts are should be four! (bad 2)');
	assert.equal(3, p.number_of_edge_partitions(),
      		     'edge parts should be three! (bad 2)');
	assert.equal(2, p.max_partition_width(),
		     'max part (bad 2)');
	
	// TODO: Once we decide what a layout format looks like. Keeping
	// this on because the full layout used to crash and I want to
	// catch it.
	var l = leng.render(g, 'bbop-sugiyama');
	//console.log(l);

    });

    it('layout feel test.', function(){

	//  a
	//  |\
	//  b c
	var bad = {
	    "nodes": [
		{"id": "a"},
		{"id": "b"},
		{"id": "c"},
		{"id": "d"}
	    ],
	    "edges": [
		{"sub": "a",
		 "obj": "b"},
		{"sub": "a",
		 "obj": "c"},
		{"sub": "a",
		 "obj": "d"}
	    ]
	};
	
	var g = new graph();
	g.load_base_json(bad);
	
	// Jimmy out the sugiyama core for testing.
	var leng = new layout();
	var l = leng.render(g, 'bbop-sugiyama');

	//console.log(l);

	// Test the limits of the layout. This also acts as a basic
	// sizing test.
	var zero_zero_count = 0;
	us.each(l.nodes, function(mnode){
	    assert.isBelow(mnode.x, 2.000001, 'is below x');
	    assert.isBelow(mnode.y, 2.000001, 'is below y');
	    assert.isAbove(mnode.x, -0.00001, 'is above x');
	    assert.isAbove(mnode.y, -0.00001, 'is above y');

	    if( mnode.x === 0 && mnode.y === 0 ){
		zero_zero_count += 1;
	    }
	});

    });

});

