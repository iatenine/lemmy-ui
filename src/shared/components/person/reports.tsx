import { Component, linkEvent } from "inferno";
import {
  CommentReportResponse,
  CommentReportView,
  GetSiteResponse,
  ListCommentReports,
  ListCommentReportsResponse,
  ListPostReports,
  ListPostReportsResponse,
  ListPrivateMessageReports,
  ListPrivateMessageReportsResponse,
  PostReportResponse,
  PostReportView,
  PrivateMessageReportResponse,
  PrivateMessageReportView,
  ResolveCommentReport,
  ResolvePostReport,
  ResolvePrivateMessageReport,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { HttpService, UserService } from "../../services";
import {
  RequestState,
  apiWrapper,
  apiWrapperIso,
} from "../../services/HttpService";
import {
  amAdmin,
  editCommentReports,
  editPostReports,
  editPrivateMessageReports,
  fetchLimit,
  isBrowser,
  isInitialRoute,
  myAuthRequired,
  setIsoData,
  toast,
} from "../../utils";
import { CommentReport } from "../comment/comment-report";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { PostReport } from "../post/post-report";
import { PrivateMessageReport } from "../private_message/private-message-report";

enum UnreadOrAll {
  Unread,
  All,
}

enum MessageType {
  All,
  CommentReport,
  PostReport,
  PrivateMessageReport,
}

enum MessageEnum {
  CommentReport,
  PostReport,
  PrivateMessageReport,
}

type ItemType = {
  id: number;
  type_: MessageEnum;
  view: CommentReportView | PostReportView | PrivateMessageReportView;
  published: string;
};

interface ReportsState {
  commentReportsRes: RequestState<ListCommentReportsResponse>;
  postReportsRes: RequestState<ListPostReportsResponse>;
  messageReportsRes: RequestState<ListPrivateMessageReportsResponse>;
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  siteRes: GetSiteResponse;
  page: number;
}

export class Reports extends Component<any, ReportsState> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: ReportsState = {
    commentReportsRes: { state: "empty" },
    postReportsRes: { state: "empty" },
    messageReportsRes: { state: "empty" },
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    page: 1,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleResolveCommentReport =
      this.handleResolveCommentReport.bind(this);
    this.handleResolvePostReport = this.handleResolvePostReport.bind(this);
    this.handleResolvePrivateMessageReport =
      this.handleResolvePrivateMessageReport.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        commentReportsRes: apiWrapperIso(
          this.isoData.routeData[0] as ListCommentReportsResponse
        ),
        postReportsRes: apiWrapperIso(
          this.isoData.routeData[1] as ListPostReportsResponse
        ),
      };
      if (amAdmin()) {
        this.state = {
          ...this.state,
          messageReportsRes: apiWrapperIso(
            this.isoData.routeData[2] as ListPrivateMessageReportsResponse
          ),
        };
      }
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    const mui = UserService.Instance.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${i18n.t("reports")} - ${
          this.state.siteRes.site_view.site.name
        }`
      : "";
  }

  render() {
    return (
      <div className="container-lg">
        <div className="row">
          <div className="col-12">
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <h5 className="mb-2">{i18n.t("reports")}</h5>
            {this.selects()}
            {this.state.messageType == MessageType.All && this.all()}
            {this.state.messageType == MessageType.CommentReport &&
              this.commentReports()}
            {this.state.messageType == MessageType.PostReport &&
              this.postReports()}
            {this.state.messageType == MessageType.PrivateMessageReport &&
              this.privateMessageReports()}
            <Paginator
              page={this.state.page}
              onChange={this.handlePageChange}
            />
          </div>
        </div>
      </div>
    );
  }

  unreadOrAllRadios() {
    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.Unread && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.Unread}
            checked={this.state.unreadOrAll == UnreadOrAll.Unread}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("unread")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.All && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.All}
            checked={this.state.unreadOrAll == UnreadOrAll.All}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("all")}
        </label>
      </div>
    );
  }

  messageTypeRadios() {
    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.All && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.All}
            checked={this.state.messageType == MessageType.All}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("all")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.CommentReport && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.CommentReport}
            checked={this.state.messageType == MessageType.CommentReport}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("comments")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.PostReport && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.PostReport}
            checked={this.state.messageType == MessageType.PostReport}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("posts")}
        </label>
        {amAdmin() && (
          <label
            className={`btn btn-outline-secondary pointer
            ${
              this.state.messageType == MessageType.PrivateMessageReport &&
              "active"
            }
          `}
          >
            <input
              type="radio"
              value={MessageType.PrivateMessageReport}
              checked={
                this.state.messageType == MessageType.PrivateMessageReport
              }
              onChange={linkEvent(this, this.handleMessageTypeChange)}
            />
            {i18n.t("messages")}
          </label>
        )}
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span className="mr-3">{this.unreadOrAllRadios()}</span>
        <span className="mr-3">{this.messageTypeRadios()}</span>
      </div>
    );
  }

  commentReportToItemType(r: CommentReportView): ItemType {
    return {
      id: r.comment_report.id,
      type_: MessageEnum.CommentReport,
      view: r,
      published: r.comment_report.published,
    };
  }

  postReportToItemType(r: PostReportView): ItemType {
    return {
      id: r.post_report.id,
      type_: MessageEnum.PostReport,
      view: r,
      published: r.post_report.published,
    };
  }

  privateMessageReportToItemType(r: PrivateMessageReportView): ItemType {
    return {
      id: r.private_message_report.id,
      type_: MessageEnum.PrivateMessageReport,
      view: r,
      published: r.private_message_report.published,
    };
  }

  get buildCombined(): ItemType[] {
    const commentRes = this.state.commentReportsRes;
    const comments =
      commentRes.state == "success"
        ? commentRes.data.comment_reports.map(this.commentReportToItemType)
        : [];

    const postRes = this.state.postReportsRes;
    const posts =
      postRes.state == "success"
        ? postRes.data.post_reports.map(this.postReportToItemType)
        : [];
    const pmRes = this.state.messageReportsRes;
    const privateMessages =
      pmRes.state == "success"
        ? pmRes.data.private_message_reports.map(
            this.privateMessageReportToItemType
          )
        : [];

    return [...comments, ...posts, ...privateMessages].sort((a, b) =>
      b.published.localeCompare(a.published)
    );
  }

  renderItemType(i: ItemType) {
    switch (i.type_) {
      case MessageEnum.CommentReport:
        return (
          <CommentReport
            key={i.id}
            report={i.view as CommentReportView}
            onResolveReport={this.handleResolveCommentReport}
          />
        );
      case MessageEnum.PostReport:
        return (
          <PostReport
            key={i.id}
            report={i.view as PostReportView}
            onResolveReport={this.handleResolvePostReport}
          />
        );
      case MessageEnum.PrivateMessageReport:
        return (
          <PrivateMessageReport
            key={i.id}
            report={i.view as PrivateMessageReportView}
            onResolveReport={this.handleResolvePrivateMessageReport}
          />
        );
      default:
        return <div />;
    }
  }

  all() {
    return (
      <div>
        {this.buildCombined.map(i => (
          <>
            <hr />
            {this.renderItemType(i)}
          </>
        ))}
      </div>
    );
  }

  commentReports() {
    const res = this.state.commentReportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.comment_reports;
        return (
          <div>
            {reports.map(cr => (
              <>
                <hr />
                <CommentReport
                  key={cr.comment_report.id}
                  report={cr}
                  onResolveReport={this.handleResolveCommentReport}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  postReports() {
    const res = this.state.postReportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.post_reports;
        return (
          <div>
            {reports.map(pr => (
              <>
                <hr />
                <PostReport
                  key={pr.post_report.id}
                  report={pr}
                  onResolveReport={this.handleResolvePostReport}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  privateMessageReports() {
    const res = this.state.messageReportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.private_message_reports;
        return (
          <div>
            {reports.map(pmr => (
              <>
                <hr />
                <PrivateMessageReport
                  key={pmr.private_message_report.id}
                  report={pmr}
                  onResolveReport={this.handleResolvePrivateMessageReport}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  async handlePageChange(page: number) {
    this.setState({ page });
    await this.refetch();
  }

  handleUnreadOrAllChange(i: Reports, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), page: 1 });
    i.refetch();
  }

  handleMessageTypeChange(i: Reports, event: any) {
    i.setState({ messageType: Number(event.target.value), page: 1 });
    i.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    const promises: Promise<any>[] = [];

    const unresolved_only = true;
    const page = 1;
    const limit = fetchLimit;
    const auth = req.auth;

    if (auth) {
      const commentReportsForm: ListCommentReports = {
        unresolved_only,
        page,
        limit,
        auth,
      };
      promises.push(req.client.listCommentReports(commentReportsForm));

      const postReportsForm: ListPostReports = {
        unresolved_only,
        page,
        limit,
        auth,
      };
      promises.push(req.client.listPostReports(postReportsForm));

      if (amAdmin()) {
        const privateMessageReportsForm: ListPrivateMessageReports = {
          unresolved_only,
          page,
          limit,
          auth,
        };
        promises.push(
          req.client.listPrivateMessageReports(privateMessageReportsForm)
        );
      }
    }

    return promises;
  }

  async refetch() {
    const unresolved_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    const page = this.state.page;
    const limit = fetchLimit;
    const auth = myAuthRequired();

    this.setState({
      commentReportsRes: { state: "loading" },
      postReportsRes: { state: "loading" },
      messageReportsRes: { state: "loading" },
    });

    let form: ListCommentReports | ListPostReports | ListPrivateMessageReports =
      {
        unresolved_only,
        page,
        limit,
        auth,
      };

    this.setState({
      commentReportsRes: await apiWrapper(
        HttpService.client.listCommentReports(form)
      ),
      postReportsRes: await apiWrapper(
        HttpService.client.listPostReports(form)
      ),
    });

    if (amAdmin()) {
      this.setState({
        messageReportsRes: await apiWrapper(
          HttpService.client.listPrivateMessageReports(form)
        ),
      });
    }
  }

  async handleResolveCommentReport(form: ResolveCommentReport) {
    const res = await apiWrapper(HttpService.client.resolveCommentReport(form));
    this.findAndUpdateCommentReport(res);
  }

  async handleResolvePostReport(form: ResolvePostReport) {
    const res = await apiWrapper(HttpService.client.resolvePostReport(form));
    this.findAndUpdatePostReport(res);
  }

  async handleResolvePrivateMessageReport(form: ResolvePrivateMessageReport) {
    const res = await apiWrapper(
      HttpService.client.resolvePrivateMessageReport(form)
    );
    this.findAndUpdatePrivateMessageReport(res);
  }

  findAndUpdateCommentReport(res: RequestState<CommentReportResponse>) {
    this.setState(s => {
      if (s.commentReportsRes.state == "success" && res.state == "success") {
        s.commentReportsRes.data.comment_reports = editCommentReports(
          res.data.comment_report_view,
          s.commentReportsRes.data.comment_reports
        );
      }
      return s;
    });
  }

  findAndUpdatePostReport(res: RequestState<PostReportResponse>) {
    this.setState(s => {
      if (s.postReportsRes.state == "success" && res.state == "success") {
        s.postReportsRes.data.post_reports = editPostReports(
          res.data.post_report_view,
          s.postReportsRes.data.post_reports
        );
      }
      return s;
    });
  }

  findAndUpdatePrivateMessageReport(
    res: RequestState<PrivateMessageReportResponse>
  ) {
    this.setState(s => {
      if (s.messageReportsRes.state == "success" && res.state == "success") {
        s.messageReportsRes.data.private_message_reports =
          editPrivateMessageReports(
            res.data.private_message_report_view,
            s.messageReportsRes.data.private_message_reports
          );
      }
      return s;
    });
  }
}
