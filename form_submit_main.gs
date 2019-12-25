/**
* Form送信時トリガーをかけないと実行されない。
* Formが送信されたら回答されたリストアイテムは削除する。
* プルダウンメニュー + 日時に項目名に「(残n)」回答が来たら-1　桁数制限なし
*
* 作成：2019.12.9　ライブラリ Ver002
* 
* 他ファイルで実ライブラリの読み込みで利用するために内容を関数の中に収めた
*/
//https://www.lifull.blog/entry/2018/12/10/182307
//https://qiita.com/soundTricker/items/42266e56c0212ce6b997
function onFormSubmit(e){

  fncounterListItem(e);
    
}
/**
* Formが送信されたら回答されたリストアイテムは削除する。
* プルダウンメニュー + 日時に項目名に「(残n)」回答が来たら-1　桁数制限なし
*
* @param {object} e Formの回答
* return なし
* 作成：2019.12.10
*/
function fncounterListItem(e){
  var frm = e.source;
  var itemResponses = e.response.getItemResponses();
  var titles=[];
  var userress=[];
  var cntkey = {start:'（残 ',last:'）'};//全角括弧開始、残の後半角空白+数値n+全角括弧閉じ
  var cntoutnum = 4;//上記の文字列数
  itemResponses.forEach(function(itemResponse){
    titles.push(itemResponse.getItem().getTitle());
    userress.push(itemResponse.getResponse());
  });
  //
  var listItem =frm.getItems(FormApp.ItemType.LIST);//既存の全LISTを取得
  
  for (var i = 0; i < titles.length; i++){//for1
  
    for(var j=1;j<listItem.length;j++){//for2 大元の「日にち」リストは外す
    
      var choices = [];
      var rests = [];
      var title = titles[i];
      var userres = userress[i];
      if (listItem[j].getTitle()==title){//if1 タイトルが一致するLISTを選択
        var delitem = listItem[j];
        var item = listItem[j].asListItem()//変数itemにobjectを格納
        var choices = item.getChoices();
        for(var k =0;k<choices.length;k++){//for3
          var choice = choices[k].getValue();
          if(choice === userres){//if2
            var inumstart = choice.indexOf(cntkey.start);//1文字は目は0番目
            Logger.log('キーの番目:'+ inumstart + ' choice文字数:' + choice.length);
            var inumlen = choice.length-inumstart-cntoutnum;//数値の桁数
            var cnt = (choice.substr( inumstart+cntoutnum-1,inumlen ));
            Logger.log('桁数' + inumlen　+'数' + cnt);
            var restnum = cnt -1;
            if(0<restnum){//if3
              //文字列置換してからセットする
              var after  = choice.substr(0,inumstart) + cntkey.start + restnum +cntkey.last;
              Logger.log('after=' + after + 'choice=' + choice);
              choice = choice.replace(choice, after);
              rests.push(choice);
            }//if3
          }else{
              rests.push(choice);
           }//if2
          }//for3
        //choices.push(item.createChoice(newChoice));
        Logger.log('title:' + title + 'rests:' + rests);
        if(rests.length<1){//if2 最後の選択肢だったらitemを削除する
          frm.deleteItem(delitem);
          break;//ListItemの処理を終わらせる
        }else{
          item.setChoiceValues(rests);
        }//if2
      }//if1
    
    }//for2
    
  }//for1

}
