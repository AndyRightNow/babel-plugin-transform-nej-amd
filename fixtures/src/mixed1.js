NEJ.define(function(_p,_o,_f,_r){
  var _extpro = Function.prototype;
  
  _extpro._$aop = function(_before,_after){
      var _after = _after||_f,
          _before = _before||_f,
          _handler = this;
      return function(){
          var _event = {args:_r.slice.call(arguments,0)};
          _before(_event);
          if (!_event.stopped){
              _event.value = _handler.apply(this,_event.args);
              _after(_event);
          }
          return _event.value;
      };
  };
  
  _extpro._$bind = function() {
      var _args = arguments,
          _object = arguments[0],
          _function = this;
      return function(){
          // not use slice for chrome 10 beta and Array.apply for android
          var _argc = _r.slice.call(_args,1);
          _r.push.apply(_argc,arguments);
          return _function.apply(_object||null,_argc);
      };
  };

  _extpro._$bind2 = function() {
      var _args = arguments,
          _object = _r.shift.call(_args),
          _function = this;
      return function(){
          _r.push.apply(arguments,_args);
          return _function.apply(_object||null,arguments);
      };
  };
  // for compatiable
  var _extpro = String.prototype;
  if (!_extpro.trim){
       _extpro.trim = (function(){
          var _reg = /(?:^\s+)|(?:\s+$)/g;
          return function(){
              return this.replace(_reg,'');
          };
       })();
  }
  if (!this.console){
      this.console = {
          log:_f,
          error:_f
      };
  }

  if (CMPT){
      NEJ = this.NEJ||{};
      // copy object properties
      // only for nej compatiable
      NEJ.copy = function(a,b){
          a = a||{};
          b = b||_o;
          for(var x in b){
              if (b.hasOwnProperty(x)){
                  a[x] = b[x];
              }
          }
          return a;
      };
      // NEJ namespace
      NEJ = NEJ.copy(
          NEJ,{
              O:_o,R:_r,F:_f,
              P:function(_namespace){
                  if (!_namespace||!_namespace.length){
                      return null;
                  }
                  var _package = window;
                  for(var a=_namespace.split('.'),
                          l=a.length,i=(a[0]=='window')?1:0;i<l;
                          _package=_package[a[i]]=_package[a[i]]||{},i++);
                  return  _package;
              }
          }
      );
      
      return NEJ;
  }

  return _p;
});
