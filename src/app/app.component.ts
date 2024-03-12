import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    connectionId = '';
    invitationUrl = '';
    connectionStatus = '';
    proofRecordId = '';
    presentationState = '';
    presentationResponse = {};

    diplomaData: any = {};

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.http
            .post<any>(environment.invitationUrlApi, {})
            .subscribe((response: any) => {
                console.log(response);
                if (
                    'data' in response &&
                    'connection' in response.data &&
                    'id' in response.data.connection &&
                    'invitationUrl' in response.data
                ) {
                    this.connectionId = response.data.connection.id;
                    this.invitationUrl = response.data.invitationUrl;

                    console.log(this.connectionId);
                    console.log(this.invitationUrl);

                    this.pollForVerification();
                } else {
                    alert(
                        'Error: The response does not contain the expected property!'
                    );
                }
            });
    }

    pollForVerification() {
        const url = `${environment.connectionApi}/${this.connectionId}`;

        const poll$ = interval(500);
        poll$
            .pipe(takeWhile(() => this.connectionStatus !== 'trusted'))
            .subscribe(() => {
                this.http.get(url).subscribe((response: any) => {
                    console.log(response);
                    if (
                        'data' in response &&
                        'records' in response.data &&
                        'status' in response.data.records
                    ) {
                        this.connectionStatus = response.data.records.status;

                        if (response.data.records.status === 'trusted') {
                            this.sendPresentationRequest();
                        }
                    }
                });
            });
    }

    sendPresentationRequest() {
        let obj = {
            comment: 'comments',
            connectionId: this.connectionId,
            attributes: [
                {
                    attributeName: 'user_id',
                    schemaId: 'dxmeeRVwfAQecNy1AXuws:2:MoodleCred:1.0.0',
                    credentialDefId:
                        'dxmeeRVwfAQecNy1AXuws:3:CL:319876:MoodleCredTest',
                },
                {
                    attributeName: 'course_name',
                    schemaId: 'dxmeeRVwfAQecNy1AXuws:2:MoodleCred:1.0.0',
                    credentialDefId:
                        'dxmeeRVwfAQecNy1AXuws:3:CL:319876:MoodleCredTest',
                },
                {
                    attributeName: 'grade',
                    schemaId: 'dxmeeRVwfAQecNy1AXuws:2:MoodleCred:1.0.0',
                    credentialDefId:
                        'dxmeeRVwfAQecNy1AXuws:3:CL:319876:MoodleCredTest',
                },
            ],
        };

        console.log(obj);
        console.log(environment.presentationRequestApi);

        this.http
            .post<any>(environment.presentationRequestApi, obj)
            .subscribe((response) => {
                console.log(response);
                if ('data' in response && 'proofRecordId' in response.data) {
                    this.proofRecordId = response.data.proofRecordId;

                    // start polling for connection status
                    this.pollForPresentation();
                } else {
                    alert(
                        'Error: The response does not contain the expected property!'
                    );
                }
            });
    }

    pollForPresentation() {
        const url = `${environment.presentationsApi}?proofRecordId=${this.proofRecordId}`;
        console.log(url);

        const poll$ = interval(500);
        poll$
            .pipe(takeWhile(() => this.presentationState !== 'done'))
            .subscribe(() => {
                this.http.get(url).subscribe((response: any) => {
                    console.log(response);
                    if ('data' in response && 'state' in response.data) {
                        this.presentationState = response.data.state;
                    }

                    this.presentationResponse = response;

                    this.diplomaData =
                        response.data.presentations[0].credentialSubject;
                });
            });
    }
}
