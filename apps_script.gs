// Apps Script server code (Google Apps Script)
function doGet(e){
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  const out = rows.map(function(r){
    var obj = {};
    headers.forEach(function(h,i){ obj[h]=r[i]; });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  if(body.action === 'updateStatus'){
    var subject = body.payload.Subject || '';
    var topic = body.payload.Topic || '';
    var status = body.payload.Status || '';
    var rows = sheet.getDataRange().getValues();
    var headers = rows.shift();
    for(var r=0;r<rows.length;r++){
      if(String(rows[r][headers.indexOf('Subject')])==subject && String(rows[r][headers.indexOf('Topic')])==topic){
        sheet.getRange(r+2, headers.indexOf('Status')+1).setValue(status);
        return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ok:false,err:'not found'})).setMimeType(ContentService.MimeType.JSON);
  }
  if(body.action === 'bulkSave'){
    var data = body.payload || [];
    if(!data.length) return ContentService.createTextOutput(JSON.stringify({ok:false,err:'no data'})).setMimeType(ContentService.MimeType.JSON);
    var headers = Object.keys(data[0]);
    sheet.clearContents();
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    var rows = data.map(function(r){ return headers.map(function(h){ return r[h] || ''; }); });
    sheet.getRange(2,1,rows.length, headers.length).setValues(rows);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ok:false,err:'unknown action'})).setMimeType(ContentService.MimeType.JSON);
}
