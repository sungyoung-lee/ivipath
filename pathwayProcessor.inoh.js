inohProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('inohProcessor called');

	this.A_bp3entry		= {};
	this.S_type			= 'IE';
	this.F_url			= function(id) {
		return 'pathway.php?id='+id;
	};
	this.F_preprocess	= this.bp3preprocess;
	this.F_init			= this.bp3initialize;
	this.F_getTitle		= this.bp3getTitle;
	this.F_annotate		= this.bp3annotate;
	this.F_getNode		= this.bp3getNodes;
	this.F_getEdge		= this.bp3getEdges;
	this.F_initEntry	= this.bp3initEntries;
	
	return this.init(S_pwayID);
};	
inohProcessor.prototype = new pathwayProcessor();
inohProcessor.prototype.constructor = inohProcessor;
