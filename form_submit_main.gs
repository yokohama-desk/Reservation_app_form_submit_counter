/**
* Form送信時トリガーをかけないと実行されない。
* Fromの最初のリストが親カテゴリリスト（日付）であること（前提条件）
* Formが送信されたら回答されたリストアイテムは内容を「定員」などに書き換えるスクリプト
* プルダウンメニュー + 日時に項目名に「(残n)」回答が来たら-1　桁数制限なし
*
* @param {object} e Formの回答
* return なし
* 作成：2019.12.10
* 更新：2020.06.05　削除から内容「定員」に変更へ
* 更新：2020.06.06　小カテゴリ(時間)が全て残0になったら大カテゴリ(日にち)にも定員を追加
* スクリプトID 
*/
function fncounterListItem(e){
  var frm = e.source;
  var itemResponses = e.response.getItemResponses();
  var titles=[];
  var userress=[];
  var cntkey = {start:'（残 ',last:'）'};//全角括弧開始、残の後半角空白+数値n+全角括弧閉じ
  var cntoutnum = 4;//上記の文字列数
  var fullstr = 'は定員に達したため選択できません';
  var titlezeros = [];//日にち（大カテゴリ）自体を定員に変更するときに「日にち」が入る
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
            //Logger.log('キーの番目:'+ inumstart + ' choice文字数:' + choice.length);
            var inumlen = choice.length-inumstart-cntoutnum;//数値の桁数
            var cnt = (choice.substr( inumstart+cntoutnum-1,inumlen ));
            //Logger.log('桁数' + inumlen　+'数' + cnt);
            var restnum = cnt -1;
            if(0<restnum){//if3
              //文字列置換してからセットする
              var after  = choice.substr(0,inumstart) + cntkey.start + restnum +cntkey.last;
              //Logger.log('after=' + after + 'choice=' + choice);
              choice = choice.replace(choice, after);
            }else{
              //残0
              choice = choice.substr(0,inumstart) + fullstr
            }//if3
          }//if2
          rests.push(choice);
          }//for3
        //choices.push(item.createChoice(newChoice));
        item.setChoiceValues(rests);
      }//if1
   
    }//for2
   
  }//for1
  //リスト項目の残がすべてなくなったとき日にちリストも変更する
  fnParentListCheck( frm,listItem,titlezeros,fullstr);
  
}

/**
* リスト項目の残がすべてなくなったとき親カテゴリ(日にちリスト)も変更する(作り変える)
* @param {object} from frm
* @param {object} listItem
* @param {array} titlezeros
* @param {string} fullstr
* return なし
**/
function fnParentListCheck( frm,listItem,titlezeros,fullstr){
  
  //リスト項目の残がすべてなくなったとき日にちリストも変更する
  for(var j=1;j<listItem.length;j++){//for1 大元の「日にち」リストは外す
    var cnt = 0;
    var item = listItem[j].asListItem()//変数itemにobjectを格納
    var choices = item.getChoices();
    for(var k =0;k<choices.length;k++){//for2
      
      var choice = choices[k].getValue();
      if(choice.indexOf(fullstr)<0){//定員の文字が1選択肢でもなかったら抜ける
        break;
      }else{
        cnt++;
      }
    }//for2
    if(choices.length===cnt){//リスト全部が定員となっていた時
      titlezeros.push(item.getTitle());
      item.setRequired(false);//必須から外す
    }
    
  }//for1

  //親カテゴリの希望日にも定員を追加
  if(0<titlezeros.length){//if1
    var pages = frm.getItems(FormApp.ItemType.PAGE_BREAK);
    var bestdayList = listItem[0].asListItem()//変数itemにobjectを格納
    var valuesDay = [];
    var choices = bestdayList.getChoices();
    for(var k =0;k<choices.length;k++){//for1
      
      var choice = choices[k].getValue();
      for(i=0;i<titlezeros.length;i++){//for2a
        
        if(choice === titlezeros[i]){//一致したら定員の文字を選択肢名に追加
          choice = choice + fullstr;
        }
        
      }//for2a
      for(var n=0;n<pages.length;n++){//for2b
        var pagetitle = pages[n].getTitle();           
        if(-1<choice.indexOf(pagetitle)){//タイトルに選択肢名が含まれていたら
            var pageitem = pages[n].asPageBreakItem();
            valuesDay.push(bestdayList.createChoice(choice,pageitem));
          }
          
      }//for2b
                     
   }//for1 
    bestdayList.setChoices(valuesDay);
  }//if1

}