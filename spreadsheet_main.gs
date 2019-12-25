/**
* 作成：2019.12.25　ライブラリ Ver002
*
* 時刻起動トリガーが実行されると
* 残数をチェックして内容に合わせたメールを送信する。
* 紐付けシートの名称はデフォルトのままとする("フォームの回答 1")
* メール送信記録シートの名前は"メール送信記録"とする。
* メール本文は"本文"シートとする
* 列0:タイムスタンプ 列1:アドレス 列2:名前　前提条件
* 残2以上でもフォームを開いている人が何にもいて送信するとインスタンス扱いのようなので全てその値で送信記録される。
* そのため全数という最大数設定が判断には必要
* 全数は途中で変更可能
*/
function fnConfirmMail(e){

  var ss =SpreadsheetApp.getActiveSpreadsheet();
  
  var MAILADD_SHEET = 'メール送信記録';
  var subject = '';
  var sheets = ss.getSheets();
  var sheetexists = sheets.map(function(sh){
    return sh.getName();
  });
  if(sheetexists.indexOf(MAILADD_SHEET)<0){//指定名のシートがない場合
    //メール送信記録シート追加
    InsertSheet(MAILADD_SHEET,2);    
  }
  var shsend=ss.getSheetByName(MAILADD_SHEET);
  var ssends=shsend.getDataRange().getValues();
  ssends =  ssends.filter(function(e){return e[0] !== "";});//空の要素を削除する  
  var mailrecordtitle = ['送信時間','メールアドレス','宛先名','可否'];
  mailrecordtitle.map(function(title,index){
    ssend.getRange(1,index+1).setValue(title);
  });
  if(ssends.length<2){//シート作成時のみ実行　初回答時に送信させるため。
    var m = Moment.moment(); //作成日時
    var mailrecordinitialdata = [m,'サンプル','サンプル','OK'];
    mailrecordinitialdata.map(function(title,index){
      shsend.getRange(1,index+1).setValue(title);
    });
  }
  
  var FORMRET_SHEET = 'フォームの回答 1';
  var ssdatas = ss.getSheetByName(FORMRET_SHEET).getDataRange().getValues(); 
  var ssform=ss.getSheetByName(FORMRET_SHEET);
  var addcol=1;//メールアドレスはB列
  var namecol=2;//宛名はC列  
  ssdatas = ssdatas.filter(function(e){return e[0] !== "";});//空の要素を削除する
  
  var MAILCONTENTS_SHEET = '本文';
  var sscontents= ss.getSheetByName(MAILCONTENTS_SHEET).getDataRange().getValues(); 
  //2行目:OK 3行目:NGの場合のメール内容
  var ok_contents = {judge:sscontents[1][0],subject:sscontents[1][1],content:sscontents[1][2]};
  var ng_contents = {judge:sscontents[2][0],subject:sscontents[2][1],content:sscontents[2][2]};
  
  var maxnum = {start:'［全 ',last:'］'}; //全角括弧開始、全の後半角空白 + 数値n+全角括弧閉じ
  var cntkey = {start:'（残 ',last:'）'};//全角括弧開始、残の後半角空白+数値n+全角括弧閉じ
  var cntoutnum = 4;//上記の文字列数
  var datatitle = ssdata.splice(0, 1)[0];
  var confirmrows=[];// 

  //申込数が全num以上あるかどうかをチェック
  var data = ssdatas[0];  
  var indexlists = data.map(function(value,maxnum,index){
    var ret=[];//ターゲット項目(時間)列群
    var inumstart = value.indexOf(maxnum.start);//1文字は目は0番目
    if(-1<inumstart){
      ret.push(index);//配列のindex番号リストをセット
    }
    return ret;    
  });
  
  //項目(時間)列抽出 --A
  for(var i=0;i<indexlists.length;i++){//列数
    var col = indexlists[i];//項目列
    var targetcollist=[];//列群
    var targetobj={};
    var targetobjarr=[];
    var targetcol={};//項目(セル)内容
    //必要データを連想配列化
    for(var j=0;j<ssdatas.length;j++){//1列
      var data = ssdatas[j][col];//セルデータ
      targetcol.item.push(data.substr(0,data.indexOf(maxnum.start)+1));
      targetcol.max.push(Number(data.indexOf(maxnum.last))-Number(data.indexOf(maxnum.start)));
      targetcol.rest.push(Number(data.indexOf(cntkey.last))-Number(data.indexOf(cntkey.start)));      
      targetcol.row.push(j);
    } 

    //グルーピング　項目ごと(10時　など)---B
    targetcollist.push(targetcol); 
    var itemlists=[];
    for(var k=0;k<targetcollist.length;k++){
        
      var targetitems = {};
      targetcollist.map(function (i,j) {
        var cat=i["item"];        
        if(typeof targetitems[cat]=="undefined"){
          targetitems[cat]=[];
          itemlists.push(cat);
        }
        targetitems[cat].push(i);
      });

      for(var n=0;n<itemlists.length;n++){
        var cat=itemlists[n];
        //降順に並び替え　項目中最新の全数を採用する
        targetitems[cat].sort(function(a,b){
          if (a.row < b.row) {
            return 1;
          } else {
            return -1;
          }
        })        
        var diffnum = targetitems[cat][0].max<targetitems[cat].length

        if(diffnum < 0){//全数より申込数が多い
          for(var m=0;m<diffnum;m++){
            confirmrows.push(targetitems[cat][m].row); 
          }
        }      
      }

    }//グルーピング　項目ごと(10時　など) --B

  }//項目(時間)列抽出 --A
  
  //前回実行時間後のタイムスタンプ記録行のみ実行
  var maildatas=[];
  var lastrow=ssends.length;
  var lasttime = ssends[lastrow][0];
  var colmax = ssdatas[0].length;
  for(var i=1;i<ssdatas.length;i++){//データの数だけ
  
    if(lasttime < ssdatas[i][0]){//未送信のデータ
      var toadd =  ssdatas[i][addcol];
      //該当の宛先にメール送信　＋ 書き込み
      if(0<confirmrows.length){
        for(var j=0;j<confirmrows;j++){
          var strjudge = 'NG';
          var j = confirmrows[j];
          ssform.getDataRange(i,colmax).setValue(strjudge);
          var arrcontents = ng_contents;
        }
      }else{
        var strjudge = 'OK';
        ssform.getDataRange(i,colmax).setValue(strjudge);  
        var arrcontents = ok_contents;
      }
      var content = createTextMail(toadd,ssdatas[i],arrcontents); 
      
    }
  }

}
/**
 * シート追加
 * @param String sheetname シート名指定
 * @param Number num 何番目に追加か
 */
function InsertSheet(sheetname,num) {
  var objSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  objSpreadsheet.insertSheet(sheetname,num);
}
/**
 * 
 * TEXT mail 作成
 * @param array ssdata フォーム回答シートの1レコード
 * @param array content 本文シートのOK／NG別の1レコード
 * ssdata=>列0:タイムスタンプ 列1:アドレス 列2:名前　前提条件
 * https://www.sejuku.net/blog/21812
 */
function createTextMail(toadd,ssdata,contents){

  var subject = contents.subject;
  var datas = ssdata.join('\n');//配列を改行で結合して文字列で返す
  var body = ssdata[2] + '様' + '\n' +  
    '[ 申込内容 ]' + '\n' + datas  + '\n' + contents.content;    
  sendMail(toadd,subject,body) ;
  
}
/**
 * 参考
 * https://www.terakoya.work/google-apps-script-json-mail/
 * https://tonari-it.com/gas-coding-guide-line/
 */

/**
 * TEXT mail send.
 * 
 * @param String content
 * @param String subject
 * @param String content
 */
function sendMail(toadd,subject,content) {
  MailApp.sendEmail({
    to: toadd,
    subject: subject,
    body: content
  });
}
