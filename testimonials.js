(() => {
'use strict';
const form=document.getElementById('testimonialForm'), status=document.getElementById('reviewStatus');
const value=id=>document.getElementById(id).value.trim();
function prepare(){
 if(!form.reportValidity())return null;
 if(value('reviewText').length<20||!value('reviewName')){status.textContent='Please enter your name and at least 20 characters about your experience.';return null;}
 const body=['Testimonial for Sam — Anytime Business Finance','',
 'Name: '+value('reviewName'),'Relationship: '+value('reviewRelationship'),
 'Company / organisation: '+(value('reviewCompany')||'Not supplied'),
 'Job title: '+(value('reviewRole')||'Not supplied'),'','Testimonial:',value('reviewText'),'',
 'Publication permission: I confirm this is my own genuine experience. I give Anytime Business Finance permission to publish this testimonial with my name, relationship and the company / job title supplied above, after review.'].join('\n');
 document.getElementById('reviewDraft').value=body;
 document.getElementById('reviewFallback').hidden=false;
 return body;
}
form.addEventListener('submit',event=>{
 event.preventDefault();
 const body=prepare();if(body===null)return;
 status.textContent='Your email draft is ready. Please send it from your email app. Nothing has been submitted by this website.';
 window.location.href='mailto:sam@anytimebusinessfinance.co.uk?subject='+encodeURIComponent('Testimonial for Sam — Anytime Business Finance')+'&body='+encodeURIComponent(body);
});
document.getElementById('copyTestimonial').addEventListener('click',()=>{
 if(prepare()===null)return;
 status.textContent='Copy the prepared text below and email it to Sam. Nothing has been sent yet.';
 document.getElementById('reviewDraft').focus();document.getElementById('reviewDraft').select();
});
})();