pathwayProcessor = function() {
	/* Namespaces for BioPAX 3 */
	this.bp = "http://www.biopax.org/release/biopax-level3.owl#";
	this.rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
	
	/**
	 * The type of pathway of instance (two characters)
	 * Currently defined values are:
	 *  -- : undefined
	 *  hs : KEGG hsa
	 *  WP : WikiPathway
	 *  R- : Reactome
	 *  PW : HumanCyc
	 *  P0 : PANTHER
	 *  Ne : NetPath
	 *  SM : SMPDB
	 *  PA : PharmGKB
	 *  pi : NCI-PID
	 *  IE : INOH
	 * @member {String}
	 */
	this.S_type			= null;
		
	/**
	 * The origin path of pathway
	 * @member {String}
	 */
	this.S_path			= null;

	/**
	 * The components of the pathway
	 * @member {Array}
	 */
	this.A_component	= [];

	/**
	 * The pathway name
	 * @member {String}
	 */
	this.S_title		= null;
	
	/**
	 * The pathway description
	 * @member {Array}
	 */
	this.A_desc			= [];
		
	/**
	 * The pathway identifier
	 * @member {String}
	 */
	this.S_id			= null;
		
	/**
	 * XML object of the pathway
	 * @member {Object}
	 */
	this.H_xml			= null;
	
	/**
	 * A url generate function to fetch the pathway
	 * @member {Function}
	 */
	this.F_url			= null;
	
	/**
	 * A function to preprocess the pathway ID to query
	 * @member {Function}
	 */
	this.F_pwayID		= null;
		
	/**
	 * Final node dataset
	 * @member {Array}
	 */
	this.A_entry		= {};
	
	/**
	 * Cache for nodes in XML file
	 * @member {Array}
	 */
	this.A_nodes		= [];
	
	/**
	 * Cache for edges in XML file
	 * @member {Array}
	 */
	this.A_edges		= [];
	
	this.init = function(S_pwayID) {
		this.S_type		= S_pwayID.substring(0, 2);
		this.S_id		= S_pwayID;
		/* Fetch XML */
		var S_url		= this.F_url(this.F_pwayID ? this.F_pwayID(this.S_id) : this.S_id);
		/* Fetch option */
		var S_opt		= null;
		if (this.F_urlOption !== undefined)
			S_opt		= this.F_urlOption(this.F_pwayID ? this.F_pwayID(this.S_id) : this.S_id);
		Ldebug('Init with ['+S_url+']');
		this.H_xml		= getXML(S_url, S_opt);
		this.S_title	= this.title();
	};
};

pathwayProcessor.prototype.type = function() {
	return this.S_type;
}
pathwayProcessor.prototype.initialize = function() {
	if (undefined !== this.F_init) this.F_init(this.H_xml);
	if (undefined !== this.F_getDesc) this.A_desc = this.F_getDesc(this.H_xml);
}
pathwayProcessor.prototype.xml = function() {
	return this.H_xml;
}
pathwayProcessor.prototype.sane = function() {
	return this.H_xml !== null;
}
pathwayProcessor.prototype.nodes = function() {
	if (this.A_nodes.length) return this.A_nodes;
	this.A_nodes = this.F_getNode(this.H_xml);
	Lnotice('['+this.A_nodes.length+'] nodes found');
	return this.A_nodes;
}
pathwayProcessor.prototype.edges = function() {
	if (this.A_edges.length) return this.A_edges;
	this.A_edges = this.F_getEdge(this.H_xml);
	Lnotice('['+this.A_edges.length+'] edges found');
	return this.A_edges;
}
pathwayProcessor.prototype.entries = function() {
	return this.A_entry;
}
pathwayProcessor.prototype.annotate = function() {
	if (typeof this.F_annotate == 'function') this.F_annotate();
	return this;
}
pathwayProcessor.prototype.preprocess = function() {
	if (typeof this.F_preprocess == 'function') this.F_preprocess(this.H_xml);
	return this;
}
pathwayProcessor.prototype.initEntry = function() {
	var ret = this.F_initEntry();
	var cnt = 0;
	for (var i in this.A_entry)
		if (this.A_entry.hasOwnProperty(i)) cnt++;
	Lnotice("["+cnt+"] entries initialized");
	return this;
}
pathwayProcessor.prototype.title = function() {
	if (this.S_title) return this.S_title;
	var S_ret = this.F_getTitle ? this.F_getTitle(this.H_xml) : null;
	if (S_ret) Lcmt("Pathway title: "+S_ret);
	return S_ret;
}

/* Element.prototype extension */

Element.prototype.getChildTextNS = function(S_ns, S_tag) {
	var sel = this.getElementsByTagNameNS(S_ns, S_tag);
	if (sel.length < 1) return '';
	return sel[0].textContent;
}

Element.prototype.getChildsByTagNameNS = function(S_ns, S_tag) {
	var ret = [];
	for (var i=0 ; i<this.childNodes.length ; i++) {
		var I = this.childNodes[i];
		if (I.namespaceURI != S_ns) continue;
		if (I.localName != S_tag) continue;
		ret.push(I);
	}
	return ret;
}

Element.prototype.get = function(attr_req, attr_opt) {
	if (typeof attr_req == 'string') attr_req = [ attr_req ];
	if (typeof attr_opt == 'string') attr_opt = [ attr_opt ];
	
	var ret = {};
	var insane = null;
	if (undefined !== attr_req.length) for (var i=0,len=attr_req.length ; i<len ; ++i) {
		var ar = attr_req[i];
		if (ar instanceof Array) {
			if (!this.hasAttributeNS(ar[0], ar[1])) {
				insane = ar[1];
				break;
			}
			ret[ar] = this.getAttributeNS(ar[0], ar[1]);
		} else {
			if (!this.hasAttribute(ar)) {
				insane = ar;
				break;
			}
			ret[ar] = this.getAttribute(ar);
		}
	} else for (var i in attr_req) if (attr_req.hasOwnProperty(i)) {
		var ar = attr_req[i];
		if (ar instanceof Array) {
			if (!this.hasAttributeNS(ar[0], ar[1])) {
				insane = ar[1];
				break;
			}
			ret[i] = this.getAttributeNS(ar[0], ar[1]);
		} else {
			if (!this.hasAttribute(ar)) {
				insane = ar;
				break;
			}
			ret[i] = this.getAttribute(ar);
		}
	}
	if (undefined !== attr_opt) {
		if (undefined !== attr_opt.length) for (var i=0,len=attr_opt.length ; i<len ; ++i) {
			var ar = attr_opt[i];
			if (ar instanceof Array) {
				if (this.hasAttributeNS(ar[0], ar[1]))
					ret[ar] = this.getAttributeNS(ar[0], ar[1]);
			} else if (this.hasAttribute(ar)) ret[ar] = this.getAttribute(ar);
		} else for (var i in attr_opt) if (attr_opt.hasOwnProperty(i)) {
			var ar = attr_opt[i];
			if (ar instanceof Array) {
				if (this.hasAttributeNS(ar[0], ar[1])) ret[i] = this.getAttributeNS(ar[0], ar[1]);
			} else if (this.hasAttribute(ar)) ret[i] = this.getAttribute(ar);
		}
	}
	if (insane !== null) {
		Lwarn("Essential element ["+insane+"] omitted");
		console.log(this);
		ret = null;
	}
	return ret;
}

function initPathwayProcessor(S_pwayID) {
	switch (S_pwayID.substring(0, 2)) {
	case 'hs': return new keggProcessor(S_pwayID);
	case 'R-': return new reactomeProcessor(S_pwayID);
	case 'WP': return new wikipathwayProcessor(S_pwayID);
	case 'PW': return new biocycProcessor(S_pwayID);
	case 'Ne': return new netpathProcessor(S_pwayID);
	case 'PA': return new pharmgkbProcessor(S_pwayID);
	case 'SM': return new smpdbProcessor(S_pwayID);
	case 'P0': return new pantherProcessor(S_pwayID);
	case 'pi': return new pidProcessor(S_pwayID);
	case 'IE': return new inohProcessor(S_pwayID);
	default: Lerror('Unsupported pathway type ['+S_pwayID.substring(0, 2)+']'); return null;
	}
}
