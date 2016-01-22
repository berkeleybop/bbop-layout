

var us = require('underscore');
var bbop = require('bbop-core');
var cytoscape = require('cytoscape');

// Aliases
var each = us.each;
var is_defined = bbop.is_defined;
var what_is = bbop.what_is;
var uuid = bbop.uuid;

///
/// Corner layout.
///

// Between 75 and 125.
var randomer = function(){
    //var min = -25;
    //var max = 25;
    var rand = Math.random();
    //var seed = Math.floor(rand * (max-min+1) +min);
    //return seed + 100;
    return rand;
};

var random_corner_layout = function(ngraph){

    var ret = {"nodes": []};
    var nodes = [];

    // 
    each(ngraph.all_nodes(), function(node){
	nodes.push({
	    "id": node.id(),
	    "x": randomer(),
	    "y": randomer()
	});
    });

    // Final assembly.
    ret['nodes'] = nodes;

    return ret;
};

///
/// BBOP Sugiyama.
///

/* 
 * Package: sugiyama.js
 * 
 * Namespace: bbop.layout.sugiyama
 * 
 * Purpose: Sugiyama system.
 * 
 * TODO: /Much/ better documentation. I have no idea what's going on
 * in there anymore...will try to recover what I can.
 * 
 * TODO: Matrix implementation and partition->matrix step need to be
 * tightened.
 *
 * BUG: need to check if there are no edges.
 * 
 * Actually, maybe there should be a separate render section, as this
 * is just a normal graph really?
 */
var sugiyama = {};

// Speciality variables in the namespace.
//sugiyama.DEBUG = true;
sugiyama.DEBUG = false;
sugiyama.iterations = 10;

///
/// Defined some special in-house objects for helping figure out
/// the layout.
///

// Id, level, and whether it is real or not.
sugiyama.simple_vertex = function(in_id, is_virtual){
    
    var vid = in_id;
    this.is_virtual = false;
    this.level = null;
    
    if( is_virtual ){
	this.is_virtual = true;
    }
    
    this.id = function(){
	return vid;
    };  
};

// An edge. A pair of ids and virtual_p.
sugiyama.simple_edge = function( sub, obj, is_virtual ){
    
    var subject = sub;
    var object = obj;
    this.is_virtual = false;
    //var predicate = pred;
    
    //var is_virtual = false;
    //if( in_type ){
    //  is_virtual = true; }
    
    if( is_virtual ){
	this.is_virtual = true;
    }
    
    this.subject = function(){
	return subject;
    };
    
    this.object = function(){
	return object;
    };
    
    this.id = function(){
	return subject + '^' + object;
    };
    
    //this.predicate = function(){
    //  return predicate; };
};

/*
 * Wrapper for the recursive partitioner and partition object.
 * 
 * Partitions the graph into a layer cake of nodes, adds in the
 * necessary virtual nodes to make path routing work.
 */
sugiyama.partitioner = function(graph){
    //partitioner = function(graph, rel){
    
    // Internal logger.
    var logger = new bbop.logger("Partitioner");
    logger.DEBUG = sugiyama.DEBUG;
    function ll(str){ logger.kvetch(str); }
    // Warning logger.
    var yikes = new bbop.logger("Partitioner WARNING");
    function warn_me(str){ yikes.kvetch(str); }
    
    // Make use lexical scoping.
    var first_seen_reference = {};
    var last_seen_reference = {};
    var vertex_set = {};
    var edge_set = {};
    var vertex_partition_set = {};
    var edge_partition_set = {};
    var logical_paths = [];
    var maximum_partition_width = 0;
    var number_of_partitions = 0;
    
    // Dump partition.
    this.dump = function(){

	// Dump vertex partitions.
	var num_parts = 0;
	each(vertex_partition_set, function(value, key){
	    num_parts++;
	});
	for( var i = 0; i < num_parts; i++ ){
	    ll('Vertex Partition ' + i + ':');
	    
	    var curr_part = vertex_partition_set[ i ];
	    var out = [];
	    for( var j = 0; j < curr_part.length; j++ ){
		out.push('[' + curr_part[j].id() + ']');
	    }
	    ll(out.join(''));
	}

	// Dump edge partitions.
	num_parts = 0;
	each(edge_partition_set, function(value, key){
	    num_parts++;
	});
	(function(){
	    for( var i = 0; i < num_parts; i++ ){
		ll('Edge Partition ' + i + ':');
		var curr_part = edge_partition_set[ i ];
		var out = [];
		for( var j = 0; j < curr_part.length; j++ ){
		    out.push('[' + curr_part[j].id() + ']');
		}
		ll(out.join(''));
	    }
	})();
	
	// Dump paths list.
	(function(){
	    for( var i = 0; i < logical_paths.length; i++ ){
		ll('Path ' + i + ':');
		var out = [];
		for( var l = 0; l < logical_paths[i].length; l++ ){
		    out.push( logical_paths[i][l] );
		}
		ll(out.join(', '));
	    }
	})();
    };
    
    //
    this.max_partition_width = function(){
	return maximum_partition_width;
    };
    
    // Return the number of partitions.
    this.number_of_vertex_partitions = function(){
	return number_of_partitions;
    };
    
    // Return a partition.
    this.get_vertex_partition = function(integer){
	return vertex_partition_set[ integer ];
    };
    
    // Return the number of partitions.
    this.number_of_edge_partitions = function(){
	var i = 0;
	each(edge_partition_set, function(value, key){ i++; });
	return i;
    };
    
    // Return a partition.
    this.get_edge_partition = function(integer){
	return edge_partition_set[ integer ];
    };
    
    // Return the number of paths.
    this.number_of_logical_paths = function(){
	return logical_paths.length;
    };
    
    // Return the paths list.
    //this.get_logical_paths = function(integer){
    this.get_logical_paths = function(integer){
	return logical_paths;
    };
    
    // // Define the partitioner. Recursively walk the graph. BFS.
    // //function recursivePartitioner(graph, node, relation, level){
    // function recursivePartitioner(graph, node, level){
    
    // 	var curr_level = level;
    // 	var next_level = level +1;
    
    // 	ll("Saw " + node.id() + " at level " + level + "!");
    
    // 	// Have we seen it before or is it new?
    // 	var was_seen = false;
    // 	if( ! vertex_set[ node.id() ] ){
    
    // 	    // Create new vertex and add to set.
    // 	    var new_vertex = new simple_vertex(node.id());
    // 	    new_vertex.level = level;
    // 	    vertex_set[ new_vertex.id() ] = new_vertex;
    
    // 	    // Check the node in to the 'seen' references.
    // 	    first_seen_reference[ new_vertex.id() ] = level;
    // 	    last_seen_reference[ new_vertex.id() ] = level;
    
    // 	}else{
    
    // 	    if( first_seen_reference[ node.id() ] > level ){
    // 		first_seen_reference[ node.id() ] = level;
    // 	    }
    // 	    if( last_seen_reference[ node.id() ] < level ){
    // 		last_seen_reference[ node.id() ] = level;
    // 	    }
    
    // 	    was_seen = true;
    // 	}
    
    // 	// Get all the child nodes and down we go!
    // 	//var child_nodes = graph.getExtantChildren(node.id(), relation);
    // 	var child_nodes = graph.get_child_nodes(node.id());
    // 	// TODO: Better way?
    // 	//var child_nodes = graph.getChildren(node.id(), relation);
    // 	for( var i = 0; i < child_nodes.length; i++ ){
    // 	    // Add edge and descend.
    // 	    var new_edge =
    // 		new simple_edge(child_nodes[i].id(),
    // 						    node.id());
    // 	    edge_set[ new_edge.id() ] = new_edge;
    
    // 	    // Do not recur on seen nodes.
    // 	    if( ! was_seen ){
    // 		//recursivePartitioner(graph, child_nodes[i], relation, level +1);
    // 		recursivePartitioner(graph, child_nodes[i], level +1);
    // 	    }
    // 	}
    // }
    
    // Detect a cycle by seeing if the ID in question appears in the
    // search history stack.
    // TODO/BUG: make this less hyper-dumb and/or slow.
    function _cycle_p(node, stack){
	var ret = false;
	
	var id = node.id();
	each(stack, function(item){
	    if( item === id ){
		ret = true;
	    }
	});
	
	return ret;
    }
    
    // Add a new node to the global variables.
    function _new_node_at(bnode, level){
	
	ll("adding " + bnode.id() + " at level " + level + "!");
	
	// Create new vertex and add to set.
	var new_vertex = new sugiyama.simple_vertex(bnode.id());
	new_vertex.level = level;
	vertex_set[ new_vertex.id() ] = new_vertex;
	
	// Check the node in to the 'seen' references.
	first_seen_reference[ new_vertex.id() ] = level;
	last_seen_reference[ new_vertex.id() ] = level;		 
    }
    
    // Define the partitioner. Recursively walk the graph. BFS.
    //function recursivePartitioner(graph, node, relation, level){
    function recursivePartitioner(graph, node, call_stack){
	
	var curr_level = call_stack.length -1;
	var next_level = curr_level +1;
	
	ll("recur on " + node.id() + " at level " + curr_level);
	
	// Get children and see where there are.
	//var child_nodes = graph.get_child_nodes(node.id(), relation);
	var child_nodes = graph.get_child_nodes(node.id());
	ll(node.id() +' has '+ (child_nodes.length || 'no' ) +' child(ren)');
	(function(){
	    for( var i = 0; i < child_nodes.length; i++ ){
		var cnode = child_nodes[i];
		
		ll("looking at " + cnode.id());
		
		if( _cycle_p(cnode, call_stack) ){
		    ll('no update to ' + cnode.id() + ': cycle');
		}else{
		    
		    // Add edges--safe since they're
		    // definition-based and will clobber if
		    // they're already in.
		    var new_edge = new sugiyama.simple_edge(cnode.id(),
							    node.id());
		    edge_set[ new_edge.id() ] = new_edge;

		    // Nodes we have to be a little more careful with since
		    // they're what we're using for traversal.
		    if( ! vertex_set[ cnode.id() ] ){
			
			// Create new vertex and add to set.
			_new_node_at(cnode, next_level);
			
			// Since it is a new node, we traverse it.
			ll('cs (a): ' + call_stack);
			var new_csa = bbop.clone(call_stack);
			ll('cs (b): ' + new_csa);
			new_csa.push(cnode.id());
			ll('cs (c): ' + new_csa);
			recursivePartitioner(graph, cnode, new_csa);
			
		    }else{
			
			ll('to update ' + cnode.id() +
			   ' level to ' + next_level +
			   '; fsr: ' + first_seen_reference[ cnode.id() ] +
			   '; lsr: ' + last_seen_reference[ cnode.id() ]);
			
			// Otherwise, just update the levels that we've seen
			// the child at--do not descend.
			if( first_seen_reference[ cnode.id() ] > next_level ){
			    first_seen_reference[ cnode.id() ] = next_level;
			}
			if( last_seen_reference[ cnode.id() ] < next_level ){
			    last_seen_reference[ cnode.id() ] = next_level;
			    // LSR is also the level that things will
			    // appear at, so update.
			    // I believe node and simple node IDs are the same?
			    vertex_set[ cnode.id() ].level = next_level;

			    // Recur if the LSR has change--we need to
			    // update all of the nodes below.
			    ll('cs (a): ' + call_stack);
			    var new_csb = bbop.clone(call_stack);
			    ll('cs (b): ' + new_csb);
			    new_csb.push(cnode.id());
			    ll('cs (c): ' + new_csb);
			    recursivePartitioner(graph, cnode, new_csb);
			}

			// ll('updated '+ cnode.id() +' level to '+ next_level +
			//    '; fsr: '+ first_seen_reference[ cnode.id() ] +
			//    '; lsr: '+ last_seen_reference[ cnode.id() ]);
		    }
		}
	    }
	})();
    }
    
    // Run the partitioner after getting the root values (or whatever)
    // bootstrapped in.
    //var roots = graph.get_root_nodes(rel);
    var roots = graph.get_root_nodes();
    if( roots.length > 0 ){
	//partitionerBootstrap(roots);
	for( var i = 0; i < roots.length; i++ ){
	    _new_node_at(roots[i], 0);
	    recursivePartitioner(graph, roots[i], [roots[i].id()]);
	}
    }else{
    	// If there is no root (think of a "top-level" cycle),
    	// a node should be picked randomly.
    	// TODO: Test this.
    	var a_node = graph.all_nodes()[0] || null;
    	if( ! a_node ){
    	    ll('warning: apparently the graph is empty');
    	    //throw new Error('apparently the graph is empty--stop it!');
    	}else{
	    _new_node_at(a_node, 0);
    	    recursivePartitioner(graph, a_node, [a_node.id()]);
    	}
    }

    // Now we have a listing of the first and last level that a node
    // appears at. We'll go through and make a proper ordering. We know
    // that the last seen reference is where the actual node will
    // appear. If there is a difference with the listing in the first
    // node reference, the difference will be made in virtual nodes.
    var v_id = 0;
    each(edge_set, function(value, key){
	var edge = edge_set[ key ];

	//console.log('edge', edge);
	var difference = vertex_set[ edge.subject() ].level -
		vertex_set[ edge.object() ].level;
	ll('diff for ' + edge.subject() + ' -> '+
	   edge.object() + ' = ' + difference);
	ll('   ' + vertex_set[ edge.subject() ].level + '-' +
	   vertex_set[ edge.object() ].level);

	// If there is a difference, create virtual nodes and
	// paths. Deleted used edges.
	var new_path = [];
	if( difference > 1 ){
	    
	    // Create a new chain of virtual nodes.
	    var current_subject = edge.object();
	    var current_object = null;
	    var current_level = vertex_set[ edge.object() ].level; 
	    new_path.push(edge.object());
	    (function(){
		for( var i = 1; i <= difference; i++ ){

		    current_object = current_subject;
		    current_level++;

		    if( i !== difference ){
			// Make a virtual node.
			var v_node_id = '_VN_' + v_id + '_';
			v_id++;	
			var new_v_node =
				new sugiyama.simple_vertex(v_node_id, true);
			new_v_node.level = current_level;
			vertex_set[ new_v_node.id() ] = new_v_node;
			current_subject = new_v_node.id();
			new_path.push(new_v_node.id());
		    }else{
			// Last link and path step.
			current_subject = edge.subject();
			new_path.push(edge.subject());
		    }

		    // Make edge to virtual node.
		    var new_edge = new sugiyama.simple_edge(current_subject,
							    current_object,
							    true);
		    edge_set[ new_edge.id() ] = new_edge;	
		}
	    })();

	    // Since the node generator goes in reverse order.
	    new_path.reverse();

	    // Finally, delete the edge connecting these two--no
	    // longer needed.
	    delete( edge_set[ key ] );

	}else{
	    // Add the trival path.
	    new_path.push(edge.subject());
	    new_path.push(edge.object());
	}
	// Add our new path to the group.
	logical_paths.push(new_path);
    });

    // Sort the vertices into different partitions and count them.
    each(vertex_set, function(value, key){
	var vert = vertex_set[ key ];
	var lvl = vert.level;
	if( ! vertex_partition_set[ lvl ] ){
	    vertex_partition_set[ lvl ] = [];
	    number_of_partitions++; // Count the number of partitions.
	}
	vertex_partition_set[ lvl ].push(vert);
	// Count max width.
	if( vertex_partition_set[ lvl ].length > maximum_partition_width ){
	    maximum_partition_width = vertex_partition_set[ lvl ].length;
	}
    });

    // Sort the edges into different partitions. Made easier since the
    // vertices have already been sorted.
    each(edge_set, function(value, key){

	var edge = edge_set[ key ];
	var lvl = vertex_set[ edge.object() ].level;
	ll('l:' +lvl);
	if( ! edge_partition_set[ lvl ] ){
	    edge_partition_set[ lvl ] = [];
	}
	edge_partition_set[ lvl ].push(edge);
    });
};

// Takes arrays of vertices and edges as an argument. Edges must have
// the methods '.object()' and '.subject()' and Vertices must have
// method '.id()'.
sugiyama.bmatrix = function(object_vertex_partition,
			    subject_vertex_partition,
			    edge_partition){
    
    // Internal logger.
    var logger = new bbop.logger("BMatrix");
    logger.DEBUG = sugiyama.DEBUG;
    function ll(str){ logger.kvetch(str); }
    // Warning logger.
    var yikes = new bbop.logger("BMatrix WARNING");
    function warn_me(str){ yikes.kvetch(str); }

    var relation_matrix = {};
    // var object_vector = object_vertex_partition;
    // var subject_vector = subject_vertex_partition;
    var object_vector = object_vertex_partition || [];
    var subject_vector = subject_vertex_partition || [];
    // Still warn that there is an issue.
    if( ! object_vector || ! subject_vector ){
	warn_me('WARNING: We found an instance of: https://github.com/kltm/bbop-js/issues/23; using a workaround.');
    }

    (function(){
	for( var i = 0; i < edge_partition.length; i++ ){

	    var obj_id = edge_partition[i].object();
	    var sub_id = edge_partition[i].subject();

	    //
	    if( ! relation_matrix[ obj_id ] ){
		relation_matrix[ obj_id ] = {}; }
	    //if( ! relation_matrix[ sub_id ] ){
	    //  relation_matrix[ sub_id ] = {}; }

	    relation_matrix[ obj_id ][ sub_id ] = true;
	    //relation_matrix[ sub_id ][ obj_id ] = false;
	}
    })();

    // DEBUG relation matrix:
    // BUG: subject _vector occasionally undefined
    (function(){
	for( var m = 0; m <= object_vector.length -1; m++ ){
	    ll("obj: <<o: " + object_vector[m].id() + ">>"); }
	for( var n = 0; n <= subject_vector.length -1; n++ ){
	    ll("sub: <<o: " + subject_vector[n].id() + ">>"); }
    })();
    each(relation_matrix, function(ob){
	each(relation_matrix[ ob ], function(su){
	    ll("edge: <<o: " + ob + ", s: " + su + ">>");
	});
    });

    //
    function getObjectBarycenter(object){
	var weighted_number_of_edges = 0;
	var number_of_edges = 0;
	for( var s = 1; s <= subject_vector.length; s++ ){
	    if( relation_matrix[object.id()] &&
		relation_matrix[object.id()][subject_vector[s -1].id()]){
		weighted_number_of_edges += s;
		number_of_edges++;
	    }
	}
	// The '-1' is to offset the indexing.
	return ( weighted_number_of_edges / number_of_edges ) -1;
    }

    // Gets barycenter for column s.
    function getSubjectBarycenter(subject){

	var weighted_number_of_edges = 0;
	var number_of_edges = 0;
	for( var o = 1; o <= object_vector.length; o++ ){
	    if( relation_matrix[object_vector[o -1].id()] &&
		relation_matrix[object_vector[o -1].id()][subject.id()]){
		weighted_number_of_edges += o;
		number_of_edges++;
	    }
	}
	// The '-1' is to offset the indexing.
	return ( weighted_number_of_edges / number_of_edges ) -1;
    }

    // BUG: These damn things seem to reoder on equal--want no reorder
    // on equal. Reorder objects given B1 <= B2, where Bi is the
    // barycenter weight.
    this.barycentricObjectReorder = function(){  
	object_vector.sort(
	    function(a, b){
		return getObjectBarycenter(a) - getObjectBarycenter(b);
	    });
    };

    // BUG: These damn things seem to reoder on equal--want no reorder
    // on equal. Reorder subjects given B1 <= B2, where Bi is the
    // barycenter weight.
    this.barycentricSubjectReorder = function(){
	subject_vector.sort(
	    function(a, b){
		return getSubjectBarycenter(a) - getSubjectBarycenter(b);
	    });
    };
    
    // Display the stored matrix.
    this.dump = function(){
	
	var queue = [];
	var string = null;

	//ll('o:' + object_vector);
	//ll('s:' + subject_vector);

	// Print top row.
	(function(){
	    for( var i = 0; i < subject_vector.length; i++ ){
		queue.push(subject_vector[i].id());
	    }
	})();
	string = queue.join('\t');
	ll('o\\s\t' + string );
	
	// Print remainder.
	(function(){
	    for( var j = 0; j < object_vector.length; j++ ){
		queue = [];
		queue.push(object_vector[j].id());
		//ll("_(o: " + object_vector[j].id() + ")");
		for( var k = 0; k < subject_vector.length; k++ ){
		    //ll("_(o: "+object_vector[j].id() +", s: "+subject_vector[k].id()+")");
		    //ll("(j: " + j + " k: " + k + ")");
		    if( relation_matrix[object_vector[j].id()] &&
			relation_matrix[object_vector[j].id()][subject_vector[k].id()] ){
			    queue.push('(1)');
			}else{
			    queue.push('(0)');
			}
		}
		ll(queue.join('\t'));
	    }
	})();
    };
};

// Takes a graph.
// Can be queried for the position of every node and edge.
// GraphLayout = {};
// GraphLayout.Sugiyama = function
sugiyama.render = function(){
    //graph.call(this);
    this._is_a = 'sugiyama-render';

    // Get a good self-reference point.
    //var anchor = this;
    
    // Internal logger.
    var logger = new bbop.logger("SuGR");
    logger.DEBUG = sugiyama.DEBUG;
    function ll(str){ logger.kvetch(str); }
    // Warning logger.
    var yikes = new bbop.logger("SuGR WARNING");
    function warn_me(str){ yikes.kvetch(str); }

    //
    //this.layout = function(graph_in, rel){
    this.layout = function(graph_in){
	//this.layout = function(){
	
	///
	/// Step I: Make a proper hierarchy; partition the graph over
	/// 'is_a'.
	///
	
	//var partitions = new partitioner(g, 'is_a');
	//var partitions = new partitioner(graph_in, rel);
	var partitions = new sugiyama.partitioner(graph_in);
	//var partitions = new partitioner(anchor);

	// DEBUG:
	ll('Dump paritions:');
	partitions.dump();
	ll('');

	///
	/// Step II: Reduce number of crossings by vertex permutation.
	///
	
	var edge_partitions = [];
	var vertex_partitions = [];
	
	// BUG: Need to catch num_partitions < 2 Create an instatiation of
	// all of the matrix representations of the partitions.
	(function(){
	    for( var i = 0; i < partitions.number_of_edge_partitions(); i++ ){
		var epart = partitions.get_edge_partition(i);
		if( ! epart ){
	    	    throw new Error('null edge partition at level: ' + i);
		}else{
		    edge_partitions.push(epart);
		}
	    }
	})();

	//
	(function(){
	    for( var i = 0; i < partitions.number_of_vertex_partitions(); i++ ){
		var vpart = partitions.get_vertex_partition(i);
		if( ! vpart ){
	    	    throw new Error('null vertex partition at level: ' + i);
		}else{
		    vertex_partitions.push(vpart);
		}
	    }  
	})();
	
	//
	(function(){
	    for( var i = 0; i < edge_partitions.length; i++ ){
		var m = new sugiyama.bmatrix(vertex_partitions[i],
					     vertex_partitions[i +1],
					     edge_partitions[i]);
		
		ll('Matrix: ' + i);
		m.dump();
		ll('');
		
		// TODO: Can increase the number of iterations--the paper doesn't
		// really explain this.
		for( var k = 0; k < sugiyama.iterations; k++ ){
		    m.barycentricObjectReorder();
		    m.barycentricSubjectReorder();
		}

		ll('Matrix: ' + i);
		m.dump();
		ll('');
	    }
	})();

	///
	/// Step III: give proper integer X and Y positions: suspend
	/// them in a matrix.
	///

	// Create matrix for calculating layout.
	var layout_matrix = [];
	for( var i = 0; i < vertex_partitions.length; i++ ){
	    layout_matrix.push(new Array(partitions.max_partition_width()));
	}
	
	// Populate matrix and register final locations of nodes for later.
	// TODO: Sugiyama method. Temporarily did naive method.
	var real_vertex_locations = [];
	var vertex_registry = {};
	var virtual_vertex_locations = []; // 
	var m = partitions.max_partition_width();
	(function(){
	    for( var i = 0; i < vertex_partitions.length; i++ ){
		var l = vertex_partitions[i].length;
		for( var v = 0; v < l; v++ ){
		    var locale = Math.floor( (v+1) * (m/l/2) );
		    while( layout_matrix[i][locale] ){
			locale++;
		    }
		    var vid = vertex_partitions[i][v].id();
		    layout_matrix[i][locale] = vid;
		    vertex_registry[ vid ] = {x: locale, y: i};
		    if( ! vertex_partitions[i][v].is_virtual ){
			real_vertex_locations.push({x: locale, y: i, id: vid});
		    }else{
			virtual_vertex_locations.push({x: locale, y: i, id: vid});
		    }
		    ll( vid + ', x:' + locale + ' y:' + i);
		}
	    }
	})();
	
	// Convert logical paths to actual paths.
	var logical_paths = partitions.get_logical_paths();
	var described_paths = [];
	(function(){
	    for( var i = 0; i < logical_paths.length; i++ ){
		var node_trans = [];
		var waypoints = [];
		for( var j = 0; j < logical_paths[i].length; j++ ){
		    var cursor = logical_paths[i][j];
		    node_trans.push(cursor);
		    waypoints.push({x: vertex_registry[cursor].x,
				    y: vertex_registry[cursor].y });
		}
		described_paths.push({'nodes': node_trans,
				      'waypoints': waypoints});
	    }
	})();
	
	// Create a return array 
	// DEBUG:
	//   ll('Layout:');
	//   for( var i = 0; i < layout_matrix.length; i++ ){
	//     var out = [];
	//     for( var j = 0; j < layout_matrix[i].length; j++ ){
	//       out.push(layout_matrix[i][j]);
	//     }
	//     ll(out.join('\t'));
	//   }
	//   ll('');
	
	// Return this baddy to the world.
	return { nodes: real_vertex_locations,
		 virtual_nodes: virtual_vertex_locations,
		 paths: described_paths,
		 height: partitions.max_partition_width(),
		 width: partitions.number_of_vertex_partitions()};
    };
};
//bbop.extend(bbop.model.graph, bbop.model.graph);

///
/// Cytoscape layouts.
///

var cytoscape_layout_engines = function(ngraph, layout, args){

    // Hrm.
    var ll = function(obj){
	console.log(obj);
    };

    function edge_ider(e){
        return e.subject_id() + '^' + e.object_id() + '^' + e.predicate_id();
    }

    // This is a special argument from me: "inverse". Switch edge
    // directions for the layout.
    var inverse_p = false;
    if( args && args['inverse'] && args['inverse'] === true ){
	inverse_p = true;
    }

    // Translate into something cytoscape can understand.
    var elements = [];
    each(ngraph.all_nodes(), function(n){
        //ll('elm: ' + n.id());
	
        // Create the element.
        elements.push({
            group: 'nodes',
            data: {
                id: n.id(),
                degree: (ngraph.get_child_nodes(n.id()).length * 10)+
                    ngraph.get_parent_nodes(n.id()).length
            }
        });
    });

    each(ngraph.all_edges(), function(e){
	if( ! inverse_p ){
            elements.push({
		group: 'edges',
		data: {
                    id: edge_ider(e),
                    source: e.subject_id(),
                    target: e.object_id(),
                predicate: e.predicate_id(),
		}
            });
	}else{
            elements.push({
		group: 'edges',
		data: {
                    id: edge_ider(e),
                    source: e.object_id(),
                    target: e.subject_id(),
                predicate: e.predicate_id(),
		}
            });
	}
    });

    // Get roots for algorithms that need it.
    var roots = ngraph.get_root_nodes();
    var root_ids = [];
    each(roots, function(root){
        root_ids.push(root.id());
    });

    // Setup possible layouts. We'll need to try and use the
    // synchronous/discrete ones.
    var layout_opts = {
	// Not going to use because I believe it's asynchronous/continuous.
        // 'cose': {
        //     name: 'cose',
        //     padding: 10,
        //     animate: false,
        //     // animate: true,
        //     // 'directed': true,
        //     'fit': true
        //     // //'maximalAdjustments': 0,
        //     // 'circle': false,
        //     // 'roots': cyroots
        // },
        // 'sugiyama': {
        //     'name': 'grid',
        //     'padding': 30,
        //     'position': get_pos
        // },
        'random': {
            name: 'random',
            fit: true
        },
        'grid': {
            name: 'grid',
            fit: true,
            padding: 30,
            rows: undefined,
            columns: undefined
        },
        'circle': {
            name: 'circle',
            fit: true,
            sort: function(a, b){
                return a.data('degree') - b.data('degree');
            }
        },
        'breadthfirst': {
            name: 'breadthfirst',
            directed: true,
            fit: true,
            //maximalAdjustments: 0,
            circle: false//,
            //roots: root_ids
        }
        // 'arbor': {
        //  name: 'arbor',
        //  fit: true, // whether to fit to viewport
        //  padding: 10 // fit padding
        // },
    };

    // Ramp up view.
    // No "container" as running w/o graphics on (likely) server.
    var cy = cytoscape({
        elements: elements,
    });

    // Actually run the selected layout engine.
    var layout_args = layout_opts[layout];
    if( ! layout_args ){
	throw new Error('unknown layout name for our cytoscape subset: '+layout);
    }
    var l = cy.makeLayout(layout_args);
    cy.center();
    l.run();

    // Extract the information that we need for the node coordinates.
    var node_locations = [];
    // Let's keep track of how far off we are.
    var least_x = null;
    var least_y = null;
    each(ngraph.all_nodes(), function(n){

	// Try and grab the node out of cytoscape.js.
	var nid = n.id();
	var cy_node = cy.getElementById(nid);

	// Either use the cytoscape.js position, or make up a random
	// one.
	//console.log(cy_node);
	if( cy_node && cy_node.position ){

	    var node_x = cy_node.position().x;
	    var node_y = cy_node.position().y;

	    // Make sure our limits are initialized.
	    if( least_x === null ){ least_x = cy_node.position().x; }
	    if( least_y === null ){ least_y = cy_node.position().y; }

	    // Make sure it is least.
	    if( node_x < least_x ){ least_x = node_x; }
	    if( node_y < least_y ){ least_y = node_y; }

	    // Push what we have now.
	    node_locations.push({
		"id": nid,
		"x": cy_node.position().x,
		"y": cy_node.position().y
	    });
	}
    });

    // TODO: Translate what we got from cytoscape into something
    // pixel-usable for noctua.
    each(node_locations, function(nl){
	nl.x = nl.x - least_x;
	nl.y = nl.y - least_y;
    });

    // Final assembly and return.
    return {"nodes": node_locations};
};

///
/// Wrapper for layout functions.
///

var layout = function(){
    
    var anchor = this;

    anchor.render = function(graph, engine_label, args){

	// There are always at least empty arguments to pass.
	if( typeof(args) === 'undefined' ){
	    args = {};
	}

	var ret = {};
	if( engine_label === 'random-corner' ){

	    // Into the corner, but hopefully visible.
	    ret = random_corner_layout(graph);

	}else if( engine_label === 'bbop-sugiyama' ){

	    // The wonky sugiyama from scratch.
	    var srenderer = new sugiyama.render();
	    ret = srenderer.layout(graph);
	    
	}else{
	    
	    // Let cytoscape deal with the rest.
	    ret = cytoscape_layout_engines(graph, engine_label, args);
	    
	}

	return ret;
    };

    // Debug/test stems.
    anchor.sugiyama = sugiyama;
    
};

///
/// Exportable body.
///

module.exports = layout;

//
// 
//
//
